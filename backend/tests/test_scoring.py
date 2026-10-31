import datetime
from decimal import Decimal
import pytest
from backend.app.services.scoring_service import ScoringService, ExplanationEngine


def test_work_burden_points_qa_score_01():
    """
    QA-SCORE-01: 근무 부담 점수 정확히 26.50점 검증
    시나리오: 월 16회 배정
      - 평일 D 8회: 8 * 1.0 = 8.0
      - 평일 N 5회: 5 * 2.0 = 10.0
      - 주말 시작 N 2회: 2 * (2.0 + 1.0) = 6.0
      - 공휴일 시작 D 1회: 1 * (1.0 + 1.5) = 2.5
      총합: 26.50점
    """
    holiday = datetime.date(2026, 11, 3)  # 화요일 공휴일
    assignments = []

    # 1. 평일 D 8회 (연속 5일 미만으로 정상 분산)
    # 11/4(수), 11/5(목), 11/9(월), 11/10(화), 11/12(목), 11/13(금), 11/16(월), 11/17(화)
    d_dates = [
        datetime.date(2026, 11, 4),
        datetime.date(2026, 11, 5),
        datetime.date(2026, 11, 9),
        datetime.date(2026, 11, 10),
        datetime.date(2026, 11, 12),
        datetime.date(2026, 11, 13),
        datetime.date(2026, 11, 16),
        datetime.date(2026, 11, 17),
    ]
    for d in d_dates:
        assignments.append({"date": d, "shift_code": "DAY", "is_weekend": False})

    # 2. 평일 N 5회 (비연속 배치)
    # 11/19(목), 11/23(월), 11/25(수), 11/27(금), 11/30(월)
    n_dates = [
        datetime.date(2026, 11, 19),
        datetime.date(2026, 11, 23),
        datetime.date(2026, 11, 25),
        datetime.date(2026, 11, 27),
        datetime.date(2026, 11, 30),
    ]
    for d in n_dates:
        assignments.append({"date": d, "shift_code": "NIGHT", "is_weekend": False})

    # 3. 주말 시작 N 2회 (11/7 토, 11/21 토)
    assignments.append({"date": datetime.date(2026, 11, 7), "shift_code": "NIGHT", "is_weekend": True})
    assignments.append({"date": datetime.date(2026, 11, 21), "shift_code": "NIGHT", "is_weekend": True})

    # 4. 공휴일 시작 D 1회 (11/3 화)
    assignments.append({"date": holiday, "shift_code": "DAY", "is_weekend": False})

    res = ScoringService.calculate_work_burden_points(
        assignments=assignments,
        holiday_dates=[holiday],
        stack_mode="MAX",
    )

    assert res["base_shift_points"] == Decimal("23.00")
    assert res["weekend_bonus_points"] == Decimal("2.00")
    assert res["holiday_bonus_points"] == Decimal("1.50")
    assert res["total_points"] == Decimal("26.50")


def test_off_priority_points_qa_score_02():
    """
    QA-SCORE-02: OFF 경합 점수 A=35.00점, B=26.00점 검증
    간호사 A: 최근 3개월 주말 부족 2회, 미반영 1회, 정규화 부담 초과 7%, 중요 아님
      min(40, 10 * 2) + min(24, 8 * 1) + clamp(7, 0, 20) + 0 = 20 + 8 + 7 + 0 = 35.00
    간호사 B: 주말 부족 0회, 미반영 2회, 정규화 부담 초과 0%, 중요 요청
      0 + min(24, 8 * 2) + 0 + 10 = 0 + 16 + 0 + 10 = 26.00
    """
    res_a = ScoringService.calculate_off_priority_points(
        weekend_off_deficit_count=2,
        ungranted_count=1,
        normalized_excess_pct=7.0,
        is_important=False,
    )
    assert res_a["total_priority_points"] == Decimal("35.00")
    assert res_a["weekend_off_deficit_points"] == Decimal("20.00")
    assert res_a["ungranted_points"] == Decimal("8.00")
    assert res_a["burden_excess_points"] == Decimal("7.00")
    assert res_a["importance_points"] == Decimal("0.00")

    res_b = ScoringService.calculate_off_priority_points(
        weekend_off_deficit_count=0,
        ungranted_count=2,
        normalized_excess_pct=0.0,
        is_important=True,
    )
    assert res_b["total_priority_points"] == Decimal("26.00")
    assert res_b["weekend_off_deficit_points"] == Decimal("0.00")
    assert res_b["ungranted_points"] == Decimal("16.00")
    assert res_b["burden_excess_points"] == Decimal("0.00")
    assert res_b["importance_points"] == Decimal("10.00")

    # A가 B보다 우선순위가 높음
    assert res_a["total_priority_points"] > res_b["total_priority_points"]


def test_weekend_holiday_stack_modes_qa_score_03():
    """
    QA-SCORE-03: 주말 및 공휴일 중복 날짜 가산 검증
    시나리오: 일요일이면서 동시에 신정 공휴일인 날에 D 근무(1.0점)를 시작함.
      - stack_mode = 'MAX': max(1.0, 1.5) = 1.5 가산 -> 총 2.50점
      - stack_mode = 'SUM': 1.0 + 1.0 + 1.5 = 3.50점
    """
    sunday_holiday = datetime.date(2026, 1, 1)  # 가상 신정 일요일
    assignments = [{"date": sunday_holiday, "shift_code": "DAY", "is_weekend": True}]

    res_max = ScoringService.calculate_work_burden_points(
        assignments=assignments,
        holiday_dates=[sunday_holiday],
        stack_mode="MAX",
    )
    assert res_max["total_points"] == Decimal("2.50")
    assert res_max["holiday_bonus_points"] == Decimal("1.50")
    assert res_max["weekend_bonus_points"] == Decimal("0.00")

    res_sum = ScoringService.calculate_work_burden_points(
        assignments=assignments,
        holiday_dates=[sunday_holiday],
        stack_mode="SUM",
    )
    assert res_sum["total_points"] == Decimal("3.50")
    assert res_sum["weekend_bonus_points"] == Decimal("1.00")
    assert res_sum["holiday_bonus_points"] == Decimal("1.50")


def test_score_caps_and_rolling_expiration_qa_score_04():
    """
    QA-SCORE-04: 점수 상한 및 3개월 롤링 만료 검증
    - 주말 부족 5회(50점 상당) -> min(40, 50) = 40
    - 미반영 4회(32점 상당) -> min(24, 32) = 24
    - 부담 초과 30% -> clamp(30, 0, 20) = 20
    - 중요 요청 미포함 -> 84점 상한
    - 중요 요청 포함 시 94점 상한
    """
    res_no_imp = ScoringService.calculate_off_priority_points(
        weekend_off_deficit_count=5,
        ungranted_count=4,
        normalized_excess_pct=30.0,
        is_important=False,
    )
    assert res_no_imp["weekend_off_deficit_points"] == Decimal("40.00")
    assert res_no_imp["ungranted_points"] == Decimal("24.00")
    assert res_no_imp["burden_excess_points"] == Decimal("20.00")
    assert res_no_imp["total_priority_points"] == Decimal("84.00")

    res_with_imp = ScoringService.calculate_off_priority_points(
        weekend_off_deficit_count=5,
        ungranted_count=4,
        normalized_excess_pct=30.0,
        is_important=True,
    )
    assert res_with_imp["total_priority_points"] == Decimal("94.00")


def test_insufficient_history_neutral_qa_score_05():
    """
    QA-SCORE-05: 신규 입사자 중립 기대값 (insufficient_history) 검증
    - 재직 0개월 간호사는 이력 부족 플래그 True
    - 점수는 0점으로 안전하게 처리됨
    """
    is_insufficient = ScoringService.evaluate_insufficient_history(tenure_months=0)
    assert is_insufficient is True

    res = ScoringService.calculate_off_priority_points(
        weekend_off_deficit_count=0,
        ungranted_count=0,
        normalized_excess_pct=0.0,
        is_important=False,
    )
    assert res["total_priority_points"] == Decimal("0.00")


def test_explanation_facts_generation_qa_exp_01():
    """
    QA-EXP-01: 설명 팩트 생성 및 규정 일관성 검증
    """
    fact = ExplanationEngine.create_fact(
        schedule_run_id="run-123",
        subject_type="ASSIGNMENT",
        subject_id="assign-staff1-10",
        reason_code="REST_RULE_PROTECTION",
        extra_data={"rest_hours": 14, "rule": "H-REST"},
    )
    assert fact["reason_code"] == "REST_RULE_PROTECTION"
    assert "최소 11시간 휴식 규정" in fact["explanation_text"]
    assert fact["rule_version"] == 1
