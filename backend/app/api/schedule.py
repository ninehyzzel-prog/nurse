import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
import backend.app.models as models
from backend.app.schemas.schedule import (
    SchedulePeriodOut,
    ScheduleVersionOut,
    ShiftAssignmentOut,
    ShiftAssignmentUpdate,
)
from backend.app.services.validator import ScheduleValidator

router = APIRouter(prefix="/api", tags=["Schedules"])


def compute_utc_times(local_date_str: str, starts_at_str: str, ends_at_str: str, end_day_offset: int):
    """KST (UTC+9) 기준 일자와 시간 문자열로부터 UTC datetime을 계산합니다."""
    # KST 기준
    kst_offset = datetime.timedelta(hours=9)
    y, m, d = [int(p) for p in local_date_str.split("-")]
    start_dt = datetime.datetime(y, m, d)
    
    if starts_at_str and starts_at_str != "00:00" and ends_at_str != "00:00":
        sh, sm = [int(p) for p in starts_at_str.split(":")]
        eh, em = [int(p) for p in ends_at_str.split(":")]
        
        start_local = datetime.datetime(y, m, d, sh, sm)
        end_local = datetime.datetime(y, m, d, eh, em) + datetime.timedelta(days=end_day_offset)
        
        start_utc = start_local - kst_offset
        end_utc = end_local - kst_offset
    else:
        # OFF 또는 비근무
        start_utc = start_dt - kst_offset
        end_utc = start_utc
        
    return start_utc, end_utc


@router.get("/wards/{ward_id}/schedule-periods/{period_id}", response_model=SchedulePeriodOut)
def get_schedule_period(ward_id: str, period_id: str, db: Session = Depends(get_db)):
    """특정 기간의 근무표와 배정 매트릭스 조회"""
    period = db.query(models.SchedulePeriod).filter_by(id=period_id, ward_id=ward_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Schedule period not found")

    latest_ver = (
        db.query(models.ScheduleVersion)
        .filter(models.ScheduleVersion.schedule_period_id == period.id)
        .order_by(models.ScheduleVersion.version_number.desc())
        .first()
    )

    ver_out = None
    if latest_ver:
        assignments_out = []
        for a in latest_ver.assignments:
            tmpl = a.template_version.shift_template if a.template_version else None
            assignments_out.append(
                ShiftAssignmentOut(
                    id=a.id,
                    schedule_version_id=a.schedule_version_id,
                    staff_id=a.staff_id,
                    shift_template_id=tmpl.id if tmpl else "",
                    shift_template_code=tmpl.code if tmpl else "OFF",
                    local_start_date=a.local_start_date.strftime("%Y-%m-%d"),
                    start_at_utc=a.start_at_utc,
                    end_at_utc=a.end_at_utc,
                    is_pinned=a.is_pinned,
                    source=a.source,
                    note=a.note,
                )
            )

        ver_out = ScheduleVersionOut(
            id=latest_ver.id,
            schedule_period_id=latest_ver.schedule_period_id,
            version_number=latest_ver.version_number,
            status=latest_ver.status,
            published_at=latest_ver.published_at,
            created_at=latest_ver.created_at,
            assignments=assignments_out,
        )

    return SchedulePeriodOut(
        id=period.id,
        ward_id=period.ward_id,
        start_date=period.start_date,
        end_date=period.end_date,
        status=period.status,
        current_version=ver_out,
    )


@router.post("/schedule-versions/{version_id}/validate")
def validate_schedule(version_id: str, db: Session = Depends(get_db)):
    """근무표 전체 규칙 검증 (H-REST, H-ELIG, H-CONSEC, H-COV, S-SINGLE-OFF 등)"""
    validator = ScheduleValidator(db)
    try:
        report = validator.validate_version(version_id)
        return report.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/schedule-versions/{version_id}/assignments/{assignment_id}")
def update_assignment(
    version_id: str,
    assignment_id: str,
    body: ShiftAssignmentUpdate,
    db: Session = Depends(get_db),
):
    """
    특정 셀의 근무 배정 수정 및 핀 토글.
    법적 제약(legal_floor: H-REST 11시간 휴식, H-ELIG 야간불가자 등) 위반 시
    422 Unprocessable Entity 에러를 반환하여 임의 완화를 차단합니다.
    """
    assign = (
        db.query(models.ShiftAssignment)
        .filter_by(id=assignment_id, schedule_version_id=version_id)
        .first()
    )
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")

    tmpl = db.query(models.ShiftTemplate).filter_by(id=body.shift_template_id).first()
    if not tmpl:
        raise HTTPException(status_code=400, detail="Invalid shift template")

    tmpl_ver = tmpl.versions[-1] if tmpl.versions else None
    if not tmpl_ver:
        raise HTTPException(status_code=400, detail="Shift template version missing")

    # KST 기준 UTC 시간 재계산
    date_str = assign.local_start_date.strftime("%Y-%m-%d")
    new_start_utc, new_end_utc = compute_utc_times(
        date_str,
        tmpl_ver.starts_at_local,
        tmpl_ver.ends_at_local,
        tmpl_ver.end_day_offset,
    )

    # 시뮬레이션 검증: legal_floor 위반 여부 사전 체크
    temp_assignment_data = {
        "id": assign.id,
        "staff_id": assign.staff_id,
        "shift_template_id": tmpl.id,
        "local_start_date": date_str,
        "start_at_utc": new_start_utc,
        "end_at_utc": new_end_utc,
        "is_pinned": body.is_pinned if body.is_pinned is not None else assign.is_pinned,
    }

    validator = ScheduleValidator(db)
    report = validator.validate_version(version_id, temporary_assignment=temp_assignment_data)

    # legal_floor 하드 제약 위반 여부 검사
    legal_errors = [iss for iss in report.issues if iss.severity == "ERROR" and iss.is_legal_floor]
    if legal_errors:
        err = legal_errors[0]
        raise HTTPException(
            status_code=422,
            detail={
                "code": "LEGAL_FLOOR_VIOLATION",
                "rule_code": err.rule_code,
                "message": err.message,
                "staff_name": err.staff_name,
                "date": str(err.date) if err.date else None,
                "details": err.details,
            },
        )

    # 배정 변경 적용
    old_tmpl_code = assign.template_version.shift_template.code if (assign.template_version and assign.template_version.shift_template) else "OFF"
    assign.shift_template_version_id = tmpl_ver.id
    assign.start_at_utc = new_start_utc
    assign.end_at_utc = new_end_utc

    if body.is_pinned is not None:
        assign.is_pinned = body.is_pinned
        assign.source = "PINNED" if body.is_pinned else "MANUAL"
    else:
        assign.source = "MANUAL"

    if body.note is not None:
        assign.note = body.note

    # 이력 기록 (Audit Log)
    audit = models.AuditLog(
        id=f"audit-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
        actor_id="user-headnurse",
        action="UPDATE",
        entity_type="ASSIGNMENT",
        entity_id=assign.id,
        before_json=f'{{"shift_code": "{old_tmpl_code}"}}',
        after_json=f'{{"shift_code": "{tmpl.code}", "is_pinned": {assign.is_pinned}}}',
        at_utc=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Assignment updated successfully",
        "id": assign.id,
        "source": assign.source,
        "assignment": {
            "id": assign.id,
            "staff_id": assign.staff_id,
            "shift_template_id": tmpl.id,
            "shift_template_code": tmpl.code,
            "local_start_date": date_str,
            "start_at_utc": assign.start_at_utc.isoformat(),
            "end_at_utc": assign.end_at_utc.isoformat(),
            "is_pinned": assign.is_pinned,
            "source": assign.source,
        },
        "validation_summary": {
            "is_feasible": report.is_feasible,
            "error_count": report.error_count,
            "warning_count": report.warning_count,
            "warnings": [
                {
                    "rule_code": iss.rule_code,
                    "message": iss.message,
                    "date": iss.date,
                    "staff_name": iss.staff_name,
                }
                for iss in report.issues
                if iss.severity == "WARNING"
            ],
        },
    }


@router.post("/schedule-versions/{version_id}/publish")
def publish_schedule_version(
    version_id: str,
    force: bool = Query(False, description="일반 제약 위반을 인지하고 강제 확정할지 여부 (legal_floor 위반은 불가)"),
    override_reason: Optional[str] = Query(None, description="강제 확정 사유"),
    db: Session = Depends(get_db),
):
    """
    근무표 최종 확정 발행 (PUBLISH)
    - legal_floor=true 위반(H-REST, H-ELIG 등 법정 최저기준)이 1건이라도 있으면 force 여부와 무관하게 차단(422).
    - 일반 하드 제약(H-COV 등) 미달 시 force=True 및 사유 입력 시에만 발행 허용(400 -> force 허용).
    """
    ver = db.query(models.ScheduleVersion).filter_by(id=version_id).first()
    if not ver:
        raise HTTPException(status_code=404, detail="Schedule version not found")

    validator = ScheduleValidator(db)
    report = validator.validate_version(version_id)

    # 1. legal_floor 위반이 있는지 확인 (절대 override 불가)
    legal_errors = [iss for iss in report.issues if iss.severity == "ERROR" and iss.is_legal_floor]
    if legal_errors:
        err = legal_errors[0]
        raise HTTPException(
            status_code=422,
            detail={
                "code": "LEGAL_FLOOR_VIOLATION",
                "message": "법적 최저 기준(11시간 휴식, 야간 제한 등) 위반 사항이 있어 강제 발행할 수 없습니다.",
                "rule_code": err.rule_code,
                "staff_name": err.staff_name,
                "date": str(err.date) if err.date else None,
            },
        )

    # 2. 일반 하드 제약(H-COV 등) 미달 체크
    other_errors = [iss for iss in report.issues if iss.severity == "ERROR" and not iss.is_legal_floor]
    if other_errors and not force:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "하드 제약 조건 위반 사항이 존재합니다. 관리자 승인(force=true)으로 발행하거나 배정을 수정하십시오.",
                "error_count": len(other_errors),
                "issues": [
                    {"rule_code": i.rule_code, "message": i.message, "date": str(i.date) if i.date else None}
                    for i in other_errors
                ],
            },
        )

    ver.status = "PUBLISHED"
    ver.published_at = datetime.datetime.utcnow()

    # 상위 period 상태도 CONFIRMED로 변경
    if ver.period:
        ver.period.status = "CONFIRMED"

    # 감사 로그 기록
    db.add(
        models.AuditLog(
            id=f"audit-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            actor_id=ver.created_by,
            action="OVERRIDE_PUBLISH" if force else "PUBLISH_SCHEDULE",
            entity_type="SCHEDULE_VERSION",
            entity_id=version_id,
            before_json=f'{{"status": "DRAFT"}}',
            after_json=f'{{"status": "PUBLISHED", "forced": {force}, "override_reason": "{override_reason}"}}',
            at_utc=datetime.datetime.utcnow(),
        )
    )
    db.commit()

    return {
        "message": "Schedule version published successfully",
        "version_id": version_id,
        "status": ver.status,
        "is_forced": force,
    }
