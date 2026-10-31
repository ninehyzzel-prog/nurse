"""
실시간 근무표 검증 엔진 (Schedule Validator Service)
근거: docs/DOMAIN_RULES.md, MASTER_PROMPT.md §5, §6

하드 제약(Hard Constraints) 및 소프트 제약(Soft Constraints)을 검증하여
규칙 위반 사항(errors)과 권고 사항(warnings)을 구조화된 형태로 반환합니다.
"""

from typing import List, Dict, Any, Optional
import datetime
from dataclasses import dataclass, field
from decimal import Decimal
from sqlalchemy.orm import Session
import backend.app.models as models


@dataclass
class ValidationIssue:
    rule_code: str
    severity: str  # 'ERROR' | 'WARNING'
    message: str
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None
    date: Optional[str] = None
    shift_code: Optional[str] = None
    is_legal_floor: bool = False
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationReport:
    version_id: str
    is_feasible: bool
    error_count: int
    warning_count: int
    issues: List[ValidationIssue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version_id": self.version_id,
            "is_feasible": self.is_feasible,
            "error_count": self.error_count,
            "warning_count": self.warning_count,
            "issues": [
                {
                    "rule_code": iss.rule_code,
                    "severity": iss.severity,
                    "message": iss.message,
                    "staff_id": iss.staff_id,
                    "staff_name": iss.staff_name,
                    "date": iss.date,
                    "shift_code": iss.shift_code,
                    "is_legal_floor": iss.is_legal_floor,
                    "details": iss.details,
                }
                for iss in self.issues
            ],
        }


class ScheduleValidator:
    def __init__(self, db: Session):
        self.db = db

    def validate_version(
        self,
        schedule_version_id: str,
        temporary_assignment: Optional[Dict[str, Any]] = None,
    ) -> ValidationReport:
        """
        주어진 근무표 버전을 검증합니다.
        temporary_assignment가 제공되면, DB의 해당 배정을 메모리 상에서 대체하여 시뮬레이션 검증합니다.
        """
        version = (
            self.db.query(models.ScheduleVersion)
            .filter(models.ScheduleVersion.id == schedule_version_id)
            .first()
        )
        if not version:
            raise ValueError(f"ScheduleVersion {schedule_version_id} not found")

        period = version.period
        ward_id = period.ward_id

        # 1. 병동 직원 목록 및 고용 상태 조회
        staff_list = (
            self.db.query(models.StaffProfile)
            .join(models.WardMembership, models.WardMembership.user_id == models.StaffProfile.user_id)
            .filter(models.WardMembership.ward_id == ward_id)
            .all()
        )
        staff_map = {s.id: s for s in staff_list}

        # 2. 근무 템플릿 목록 조회
        templates = (
            self.db.query(models.ShiftTemplate)
            .filter(models.ShiftTemplate.ward_id == ward_id)
            .all()
        )
        template_map = {t.id: t for t in templates}
        template_code_map = {t.code: t for t in templates}

        # 3. 배정 목록 로드 및 temporary_assignment 적용
        raw_assignments = (
            self.db.query(models.ShiftAssignment)
            .filter(models.ShiftAssignment.schedule_version_id == schedule_version_id)
            .all()
        )

        assignments_data = []
        for a in raw_assignments:
            if temporary_assignment and a.id == temporary_assignment.get("id"):
                # 대체
                tpl_id = temporary_assignment["shift_template_id"]
                tpl = template_map.get(tpl_id)
                assignments_data.append(
                    {
                        "id": a.id,
                        "staff_id": a.staff_id,
                        "shift_template_id": tpl_id,
                        "shift_code": tpl.code if tpl else "UNKNOWN",
                        "local_start_date": str(a.local_start_date),
                        "start_at_utc": temporary_assignment.get("start_at_utc", a.start_at_utc),
                        "end_at_utc": temporary_assignment.get("end_at_utc", a.end_at_utc),
                        "is_pinned": temporary_assignment.get("is_pinned", a.is_pinned),
                    }
                )
            else:
                tmpl_obj = a.template_version.shift_template if (a.template_version and a.template_version.shift_template) else None
                assignments_data.append(
                    {
                        "id": a.id,
                        "staff_id": a.staff_id,
                        "shift_template_id": tmpl_obj.id if tmpl_obj else "",
                        "shift_code": tmpl_obj.code if tmpl_obj else "OFF",
                        "local_start_date": str(a.local_start_date),
                        "start_at_utc": a.start_at_utc,
                        "end_at_utc": a.end_at_utc,
                        "is_pinned": a.is_pinned,
                    }
                )

        issues: List[ValidationIssue] = []

        # 직원별 배정 그룹화 (날짜순 정렬)
        staff_assignments: Dict[str, List[Dict[str, Any]]] = {s.id: [] for s in staff_list}
        for item in assignments_data:
            if item["staff_id"] in staff_assignments:
                staff_assignments[item["staff_id"]].append(item)

        for s_id in staff_assignments:
            staff_assignments[s_id].sort(key=lambda x: x["local_start_date"])

        # 일자별/교대별 집계용
        date_shift_coverage: Dict[str, Dict[str, int]] = {}

        # ----------------------------------------------------
        # 규칙 검증 시작
        # ----------------------------------------------------
        for staff_id, a_list in staff_assignments.items():
            staff = staff_map.get(staff_id)
            staff_name = staff.display_name if staff else "간호사"
            emp = staff.employment_periods[0] if (staff and staff.employment_periods) else None
            can_work_night = emp.can_work_night if emp else True

            # (A) H-ELIG: 야간 불가자(임산부/면제자) 야간 배정 검사
            for a in a_list:
                shift_code = a["shift_code"]
                date_str = a["local_start_date"]

                # 일자별 커버리지 집계 (OFF 제외)
                if shift_code not in ("OFF", "LEAVE"):
                    if date_str not in date_shift_coverage:
                        date_shift_coverage[date_str] = {}
                    date_shift_coverage[date_str][shift_code] = date_shift_coverage[date_str].get(shift_code, 0) + 1

                if shift_code == "NIGHT" and not can_work_night:
                    issues.append(
                        ValidationIssue(
                            rule_code="H-ELIG",
                            severity="ERROR",
                            message=f"{staff_name}님은 야간 근무 제한자(임산부/단시간/신청)이므로 NIGHT 교대에 배정할 수 없습니다.",
                            staff_id=staff_id,
                            staff_name=staff_name,
                            date=date_str,
                            shift_code=shift_code,
                            is_legal_floor=True,
                            details={"can_work_night": False},
                        )
                    )

            # (B) H-REST (11시간 최소 휴식) & H-OVERLAP 검사
            # 실제 근로 배정(OFF 제외)만 추출
            work_shifts = [a for a in a_list if a["shift_code"] not in ("OFF", "LEAVE")]

            for i in range(len(work_shifts) - 1):
                cur = work_shifts[i]
                nxt = work_shifts[i + 1]

                cur_end = cur["end_at_utc"]
                nxt_start = nxt["start_at_utc"]

                rest_minutes = (nxt_start - cur_end).total_seconds() / 60.0

                # H-OVERLAP: 겹치는 경우
                if rest_minutes < 0:
                    issues.append(
                        ValidationIssue(
                            rule_code="H-OVERLAP",
                            severity="ERROR",
                            message=f"{staff_name}님의 근무 시간이 중복 배정되었습니다 ({cur['local_start_date']}와 {nxt['local_start_date']}).",
                            staff_id=staff_id,
                            staff_name=staff_name,
                            date=nxt["local_start_date"],
                            shift_code=nxt["shift_code"],
                            is_legal_floor=True,
                            details={"overlap_minutes": abs(rest_minutes)},
                        )
                    )
                # H-REST: 11시간(660분) 미만 휴식
                elif rest_minutes < 660:
                    rest_hours = round(rest_minutes / 60.0, 1)
                    issues.append(
                        ValidationIssue(
                            rule_code="H-REST",
                            severity="ERROR",
                            message=f"{staff_name}님: {cur['local_start_date']}({cur['shift_code']}) 종료 후 {nxt['local_start_date']}({nxt['shift_code']}) 시작까지 휴식 시간이 {rest_hours}시간으로, 법정 최소 기준(11시간)에 미달합니다.",
                            staff_id=staff_id,
                            staff_name=staff_name,
                            date=nxt["local_start_date"],
                            shift_code=nxt["shift_code"],
                            is_legal_floor=True,
                            details={"rest_minutes": rest_minutes, "required_minutes": 660},
                        )
                    )

            # (C) H-CONSEC: 최대 연속 근무일 (기본 5일 초과 금지)
            consecutive_work_days = 0
            for a in a_list:
                if a["shift_code"] not in ("OFF", "LEAVE"):
                    consecutive_work_days += 1
                    if consecutive_work_days > 5:
                        issues.append(
                            ValidationIssue(
                                rule_code="H-CONSEC",
                                severity="ERROR",
                                message=f"{staff_name}님: 연속 {consecutive_work_days}일째 근무로 최대 연속 근무일(5일)을 초과했습니다.",
                                staff_id=staff_id,
                                staff_name=staff_name,
                                date=a["local_start_date"],
                                shift_code=a["shift_code"],
                                is_legal_floor=False,
                                details={"consecutive_days": consecutive_work_days, "max_allowed": 5},
                            )
                        )
                else:
                    consecutive_work_days = 0

            # (D) H-NIGHT-CONSEC: 최대 연속 야간근무 (기본 3회 초과 금지)
            consecutive_nights = 0
            for a in a_list:
                if a["shift_code"] == "NIGHT":
                    consecutive_nights += 1
                    if consecutive_nights > 3:
                        issues.append(
                            ValidationIssue(
                                rule_code="H-NIGHT-CONSEC",
                                severity="ERROR",
                                message=f"{staff_name}님: 연속 {consecutive_nights}회 야간 근무로 최대 연속 야간 상한(3회)을 초과했습니다.",
                                staff_id=staff_id,
                                staff_name=staff_name,
                                date=a["local_start_date"],
                                shift_code=a["shift_code"],
                                is_legal_floor=False,
                                details={"consecutive_nights": consecutive_nights, "max_allowed": 3},
                            )
                        )
                else:
                    consecutive_nights = 0

            # (E) S-SINGLE-OFF: 1일 단독 오프 지양 (Soft warning)
            # 패턴: WORK -> OFF -> WORK
            for idx in range(1, len(a_list) - 1):
                prev_s = a_list[idx - 1]["shift_code"]
                curr_s = a_list[idx]["shift_code"]
                next_s = a_list[idx + 1]["shift_code"]

                if curr_s == "OFF" and prev_s not in ("OFF", "LEAVE") and next_s not in ("OFF", "LEAVE"):
                    issues.append(
                        ValidationIssue(
                            rule_code="S-SINGLE-OFF",
                            severity="WARNING",
                            message=f"{staff_name}님: {a_list[idx]['local_start_date']}에 1일 단독 오프(Single OFF)가 발생했습니다. 피로도 경감을 위해 2일 이상 연속 오프를 권장합니다.",
                            staff_id=staff_id,
                            staff_name=staff_name,
                            date=a_list[idx]["local_start_date"],
                            shift_code="OFF",
                            is_legal_floor=False,
                        )
                    )

        # (F) H-COV: 최소 인원 커버리지 검사 (DAY 1명, NIGHT 1명)
        # 배정 기간 내의 모든 날짜에 대해 최소 1명의 DAY와 1명의 NIGHT가 있는지 체크
        for date_str, shift_counts in date_shift_coverage.items():
            day_count = shift_counts.get("DAY", 0)
            night_count = shift_counts.get("NIGHT", 0)

            if day_count < 1:
                issues.append(
                    ValidationIssue(
                        rule_code="H-COV",
                        severity="ERROR",
                        message=f"{date_str}: 데이(DAY) 근무자가 0명입니다. (최소 1명 필수)",
                        date=date_str,
                        shift_code="DAY",
                        is_legal_floor=False,
                        details={"required": 1, "actual": day_count},
                    )
                )
            if night_count < 1:
                issues.append(
                    ValidationIssue(
                        rule_code="H-COV",
                        severity="ERROR",
                        message=f"{date_str}: 나이트(NIGHT) 근무자가 0명입니다. (최소 1명 필수)",
                        date=date_str,
                        shift_code="NIGHT",
                        is_legal_floor=False,
                        details={"required": 1, "actual": night_count},
                    )
                )

        error_count = sum(1 for iss in issues if iss.severity == "ERROR")
        warning_count = sum(1 for iss in issues if iss.severity == "WARNING")

        return ValidationReport(
            version_id=schedule_version_id,
            is_feasible=(error_count == 0),
            error_count=error_count,
            warning_count=warning_count,
            issues=issues,
        )
