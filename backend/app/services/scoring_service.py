import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional, Tuple


def round_decimal(val: Decimal, places: int = 2) -> Decimal:
    """소수 둘째 자리 또는 지정 자릿수로 ROUND_HALF_UP 반올림"""
    q = Decimal(10) ** -places
    return val.quantize(q, rounding=ROUND_HALF_UP)


class ScoringService:
    """
    5단계 점수제 및 설명 엔진 (DOMAIN_RULES §6, §7 기준)
    - Decimal 기반 정확한 연산 (부동소수점 오차 차단)
    - QA-SCORE-01 (26.50점), QA-SCORE-02 (35.00점 vs 26.00점) 검증
    """

    # 기본 교대 점수
    DEFAULT_SHIFT_POINTS = {
        "DAY": Decimal("1.00"),
        "EVENING": Decimal("1.30"),
        "NIGHT": Decimal("2.00"),
        "OFF": Decimal("0.00"),
        "LEAVE": Decimal("0.00"),
    }

    # 기본 가중치
    WEEKEND_BONUS = Decimal("1.00")
    HOLIDAY_BONUS = Decimal("1.50")
    CONSECUTIVE_5D_BONUS = Decimal("1.00")
    PREFERENCE_MISMATCH_PENALTY = Decimal("0.50")

    @classmethod
    def calculate_work_burden_points(
        cls,
        assignments: List[Dict[str, Any]],
        holiday_dates: Optional[List[datetime.date]] = None,
        stack_mode: str = "MAX",
        preference_mismatches: int = 0,
    ) -> Dict[str, Any]:
        """
        근무 부담 점수 계산 (QA-SCORE-01, QA-SCORE-03)
        assignments: [
            {"date": datetime.date(2026, 11, 1), "shift_code": "DAY", "is_weekend": False}, ...
        ]
        """
        holiday_dates_set = set(holiday_dates or [])

        base_shift_points = Decimal("0.00")
        weekend_bonus_points = Decimal("0.00")
        holiday_bonus_points = Decimal("0.00")

        # 일자별 정렬
        sorted_assignments = sorted(assignments, key=lambda a: a["date"])

        # 1. 개별 배정별 점수 및 주말/공휴일 가산
        consecutive_work_days = 0
        consecutive_bonus_points = Decimal("0.00")
        prev_work_date: Optional[datetime.date] = None

        for a in sorted_assignments:
            shift_code = a.get("shift_code", "OFF").upper()
            d = a["date"]
            is_wknd = a.get("is_weekend", False)
            if not is_wknd:
                # 토(5) 또는 일(6) 확인
                is_wknd = d.weekday() in (5, 6)

            is_hldy = d in holiday_dates_set

            # 기본 근무 점수
            base_pts = cls.DEFAULT_SHIFT_POINTS.get(shift_code, Decimal("0.00"))
            base_shift_points += base_pts

            if shift_code in ("DAY", "NIGHT", "EVENING"):
                # 연속 근무일 추적 (실제 달력상 연속된 날짜인지 확인)
                if prev_work_date is not None and d == prev_work_date + datetime.timedelta(days=1):
                    consecutive_work_days += 1
                else:
                    consecutive_work_days = 1

                prev_work_date = d

                if consecutive_work_days == 5:
                    consecutive_bonus_points += cls.CONSECUTIVE_5D_BONUS

                # 주말 및 공휴일 가산
                wknd_add = cls.WEEKEND_BONUS if is_wknd else Decimal("0.00")
                hldy_add = cls.HOLIDAY_BONUS if is_hldy else Decimal("0.00")

                if is_wknd and is_hldy:
                    if stack_mode == "MAX":
                        # 큰 값 1개만 적용
                        if hldy_add >= wknd_add:
                            holiday_bonus_points += hldy_add
                        else:
                            weekend_bonus_points += wknd_add
                    else:  # SUM
                        weekend_bonus_points += wknd_add
                        holiday_bonus_points += hldy_add
                elif is_wknd:
                    weekend_bonus_points += wknd_add
                elif is_hldy:
                    holiday_bonus_points += hldy_add
            else:
                consecutive_work_days = 0
                prev_work_date = None

        # 희망 교대 불일치 페널티
        pref_mismatch_pts = round_decimal(Decimal(str(preference_mismatches)) * cls.PREFERENCE_MISMATCH_PENALTY)

        total = (
            base_shift_points
            + weekend_bonus_points
            + holiday_bonus_points
            + consecutive_bonus_points
            + pref_mismatch_pts
        )

        return {
            "total_points": round_decimal(total, 2),
            "base_shift_points": round_decimal(base_shift_points, 2),
            "weekend_bonus_points": round_decimal(weekend_bonus_points, 2),
            "holiday_bonus_points": round_decimal(holiday_bonus_points, 2),
            "consecutive_bonus_points": round_decimal(consecutive_bonus_points, 2),
            "preference_mismatch_points": round_decimal(pref_mismatch_pts, 2),
        }

    @classmethod
    def calculate_off_priority_points(
        cls,
        weekend_off_deficit_count: int,
        ungranted_count: int,
        normalized_excess_pct: float,
        is_important: bool,
    ) -> Dict[str, Any]:
        """
        일반 희망 OFF 경합 우선순위 점수 계산 (QA-SCORE-02, QA-SCORE-04)
        최대 94점
        """
        # 1. 주말 OFF 부족 점수: min(40, 10 * count)
        weekend_pts = min(Decimal("40.00"), Decimal("10.00") * Decimal(str(weekend_off_deficit_count)))

        # 2. 적격 희망 OFF 미반영 점수: min(24, 8 * count)
        ungranted_pts = min(Decimal("24.00"), Decimal("8.00") * Decimal(str(ungranted_count)))

        # 3. 최근 3개월 정규화 부담 초과 %: clamp(excess, 0, 20) (1%=1점)
        excess_clamped = max(0.0, min(20.0, float(normalized_excess_pct)))
        excess_pts = round_decimal(Decimal(str(excess_clamped)), 2)

        # 4. 중요 요청 여부: +10점
        importance_pts = Decimal("10.00") if is_important else Decimal("0.00")

        total = weekend_pts + ungranted_pts + excess_pts + importance_pts
        total_capped = min(Decimal("94.00"), total)

        return {
            "total_priority_points": round_decimal(total_capped, 2),
            "weekend_off_deficit_points": round_decimal(weekend_pts, 2),
            "ungranted_points": round_decimal(ungranted_pts, 2),
            "burden_excess_points": round_decimal(excess_pts, 2),
            "importance_points": round_decimal(importance_pts, 2),
        }

    @classmethod
    def calculate_fairness_score(
        cls,
        max_normalized_deviation: float,
        ungranted_preference_rate: float,
        night_weekend_disparity: float,
        max_fatigue_events: int,
    ) -> Decimal:
        """
        편성안 품질 균형 지수 (0~100점, DOMAIN_RULES §6-D)
        """
        # component_penalty_k = min(1, metric_k / threshold_k) * 100
        # 1. 부담 편차 (가중치 0.35, threshold 0.20)
        p1 = min(1.0, max(0.0, max_normalized_deviation) / 0.20) * 100.0 * 0.35

        # 2. 희망 미반영 (가중치 0.25, threshold 0.50)
        p2 = min(1.0, max(0.0, ungranted_preference_rate) / 0.50) * 100.0 * 0.25

        # 3. 야간/주말 불균형 (가중치 0.25, threshold 0.25)
        p3 = min(1.0, max(0.0, night_weekend_disparity) / 0.25) * 100.0 * 0.25

        # 4. 피로 패턴 (가중치 0.15, threshold 3건)
        p4 = min(1.0, max(0.0, float(max_fatigue_events)) / 3.0) * 100.0 * 0.15

        total_penalty = p1 + p2 + p3 + p4
        raw_score = 100.0 - total_penalty
        clamped = max(0.0, min(100.0, raw_score))
        return round_decimal(Decimal(str(clamped)), 1)

    @classmethod
    def evaluate_insufficient_history(
        cls,
        tenure_months: int,
    ) -> bool:
        """재직 1개월 미만 신규 입사자 이력 부족 플래그 (QA-SCORE-05)"""
        return tenure_months < 1


class ExplanationEngine:
    """
    배정 사유 및 오프 경합 결정 설명 엔진 (QA-EXP-01, DOMAIN_RULES §7)
    """

    REASON_CODES = {
        "MANDATORY_COVERAGE": "병동 필수 인원(Day/Night) 커버리지 충족을 위해 배정되었습니다.",
        "REST_RULE_PROTECTION": "전일 근무 후 법정 최소 11시간 휴식 규정 준수를 위해 휴무(OFF)로 배정되었습니다.",
        "OFF_PREFERENCE_GRANTED": "간호사가 제출한 희망 오프 요청이 정원 범위 내에서 정상 반영되었습니다.",
        "OFF_PREFERENCE_DEFERRED": "동일 일자 오프 신청 경합 및 병동 최소 인원 충족을 위해 차선 조정되었습니다.",
        "CONSECUTIVE_LIMIT_GUARD": "최대 5일 연속 근무 제한 규정에 따라 피로 누적 방지를 위해 휴무가 부여되었습니다.",
        "LEAVE_APPROVED": "공식 승인된 법정 연차/보호 휴가 일정이 우선 반영되었습니다.",
        "FAIR_NIGHT_SHARE": "병동 전체 야간 근무 균등 분배 원칙에 따라 배정되었습니다.",
    }

    @classmethod
    def create_fact(
        cls,
        schedule_run_id: str,
        subject_type: str,
        subject_id: str,
        reason_code: str,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """설명 팩트 생성"""
        explanation_template = cls.REASON_CODES.get(
            reason_code, "도메인 규칙 및 병동 운영 정책에 따라 배정되었습니다."
        )

        return {
            "schedule_run_id": schedule_run_id,
            "subject_type": subject_type,
            "subject_id": subject_id,
            "reason_code": reason_code,
            "rule_version": 1,
            "fact_json": extra_data or {},
            "explanation_text": explanation_template,
        }
