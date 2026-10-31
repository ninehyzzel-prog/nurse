import pytest
from datetime import date, timedelta
from backend.app.services.nurse_solver import (
    NurseScheduleSolver,
    StaffInput,
    TimeOffInput,
    PinnedInput,
)


@pytest.fixture
def sample_staff():
    return [
        StaffInput(
            id="rn-1",
            name="이은솔",
            can_night=True,
            skills=["CHARGE_CAPABLE"],
            recent_night_count=8,
            recent_weekend_count=2,
            availability_ratio=1.0,
        ),
        StaffInput(
            id="rn-2",
            name="김지은",
            can_night=True,
            skills=["DELIVERY_ROOM"],
            recent_night_count=7,
            recent_weekend_count=3,
            availability_ratio=1.0,
        ),
        StaffInput(
            id="rn-3",
            name="박수민",
            can_night=True,
            skills=["NEW_GRAD"],
            recent_night_count=8,
            recent_weekend_count=3,
            availability_ratio=1.0,
        ),
        StaffInput(
            id="rn-4",
            name="최서연",
            can_night=True,
            skills=[],
            recent_night_count=9,
            recent_weekend_count=2,
            availability_ratio=1.0,
        ),
        StaffInput(
            id="rn-5",
            name="정하윤",
            can_night=True,
            skills=[],
            recent_night_count=6,
            recent_weekend_count=4,
            availability_ratio=1.0,
        ),
        StaffInput(
            id="rn-6",
            name="이민지",
            can_night=False,
            employment_type="PART_TIME",
            skills=[],
            recent_night_count=0,
            recent_weekend_count=1,
            availability_ratio=0.5,
        ),
    ]


@pytest.fixture
def shift_templates():
    return {
        "DAY": "shift-day-uuid",
        "NIGHT": "shift-night-uuid",
        "OFF": "shift-off-uuid",
    }


def test_solver_balanced_feasible(sample_staff, shift_templates):
    """균형형 모드(BALANCED) 풀이 성공 및 하드 제약 검증"""
    start = date(2026, 11, 1)
    end = date(2026, 11, 30)

    time_offs = [
        TimeOffInput(staff_id="rn-1", date=date(2026, 11, 10), type="PREFERENCE_OFF", priority_points=85),
        TimeOffInput(staff_id="rn-2", date=date(2026, 11, 10), type="PREFERENCE_OFF", priority_points=67),
    ]

    solver = NurseScheduleSolver(
        start_date=start,
        end_date=end,
        staff_list=sample_staff,
        shift_template_ids=shift_templates,
        time_off_requests=time_offs,
        default_day_coverage=2,
        default_night_coverage=1,
    )

    result = solver.solve(mode="BALANCED", rank=1)

    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert result.rank == 1
    assert result.mode == "BALANCED"
    assert len(result.assignments) == len(sample_staff) * 30
    assert len(result.explanation_points) > 0

    assign_map = {(a["staff_id"], a["date"]): a["shift_code"] for a in result.assignments}

    # 1. 법적 11시간 최소 휴식 검증: N 다음날 D 배정 0건
    for s in sample_staff:
        for day in range(1, 30):
            d1 = date(2026, 11, day).isoformat()
            d2 = date(2026, 11, day + 1).isoformat()
            if assign_map.get((s.id, d1)) == "NIGHT":
                assert assign_map.get((s.id, d2)) != "DAY", f"{s.name} 간호사 {d1} 야간 후 {d2} 주간 배정 위반!"

    # 2. 야간 불가자(임산부/단시간) 검증: rn-6 야간 배정 0건
    for day in range(1, 31):
        d_str = date(2026, 11, day).isoformat()
        assert assign_map.get(("rn-6", d_str)) != "NIGHT"

    # 3. 최대 연속 근무 5일 제한 검증
    for s in sample_staff:
        consec = 0
        for day in range(1, 31):
            d_str = date(2026, 11, day).isoformat()
            sh = assign_map.get((s.id, d_str))
            if sh in ("DAY", "NIGHT"):
                consec += 1
                assert consec <= 5, f"{s.name} 간호사 연속 근무 5일 초과 ({consec}일)"
            else:
                consec = 0


def test_solver_h_skill_night_coverage(sample_staff, shift_templates):
    """H-SKILL 검증: 야간 근무 시 필수 역량(책임 또는 분만실) 간호사 최소 1명 배정 및 신규 단독 배제"""
    start = date(2026, 11, 1)
    end = date(2026, 11, 15)

    solver = NurseScheduleSolver(
        start_date=start,
        end_date=end,
        staff_list=sample_staff,
        shift_template_ids=shift_templates,
        time_off_requests=[],
        default_day_coverage=2,
        default_night_coverage=1,
    )

    result = solver.solve(mode="BALANCED", rank=1)
    assert result.status in ("OPTIMAL", "FEASIBLE")

    assign_map = {(a["staff_id"], a["date"]): a["shift_code"] for a in result.assignments}

    # 매일 야간에 배정된 간호사 중 최소 1명은 rn-1(CHARGE) 또는 rn-2(DELIVERY)여야 함
    for day in range(1, 16):
        d_str = date(2026, 11, day).isoformat()
        night_nurses = [s.id for s in sample_staff if assign_map.get((s.id, d_str)) == "NIGHT"]
        assert len(night_nurses) >= 1
        has_skilled = any(n in ("rn-1", "rn-2") for n in night_nurses)
        assert has_skilled, f"{d_str} 야간에 책임/분만실 역량 간호사가 배정되지 않음!"

        # 신규(rn-3)는 단독 야간 배정 금지
        if "rn-3" in night_nurses:
            assert len(night_nurses) >= 2, f"{d_str}에 신규 간호사 rn-3이 단독으로 야간에 배정됨!"


def test_solver_h_week_hours_limit(sample_staff, shift_templates):
    """H-WEEK 검증: 모든 7일 rolling window 실근로시간 52시간(3,120분) 이하 준수"""
    start = date(2026, 11, 1)
    end = date(2026, 11, 30)

    solver = NurseScheduleSolver(
        start_date=start,
        end_date=end,
        staff_list=sample_staff,
        shift_template_ids=shift_templates,
        time_off_requests=[],
        default_day_coverage=2,
        default_night_coverage=1,
    )

    result = solver.solve(mode="BALANCED", rank=1)
    assert result.status in ("OPTIMAL", "FEASIBLE")

    assign_map = {(a["staff_id"], a["date"]): a["shift_code"] for a in result.assignments}

    for s in sample_staff:
        for start_day in range(1, 25):  # 7일 윈도우: 1~7, ..., 24~30
            week_minutes = 0
            for d in range(start_day, start_day + 7):
                d_str = date(2026, 11, d).isoformat()
                sh = assign_map.get((s.id, d_str))
                if sh == "DAY":
                    week_minutes += 540  # 9시간
                elif sh == "NIGHT":
                    week_minutes += 780  # 13시간
            assert week_minutes <= 3120, f"{s.name} 간호사 {start_day}일부터 7일간 근로시간 {week_minutes}분으로 주 52시간 초과!"


def test_solver_h_boundary_lookback(sample_staff, shift_templates):
    """H-BOUNDARY 검증: 전월 말 10/31 NIGHT 근무 이력 시 11/1 무조건 100% OFF 강제"""
    start = date(2026, 11, 1)
    end = date(2026, 11, 10)

    # rn-1 간호사가 10/31에 NIGHT를 근무함
    lookback = [
        {"staff_id": "rn-1", "date": date(2026, 10, 31), "shift_code": "NIGHT"},
        {"staff_id": "rn-2", "date": date(2026, 10, 31), "shift_code": "DAY"},
    ]

    solver = NurseScheduleSolver(
        start_date=start,
        end_date=end,
        staff_list=sample_staff,
        shift_template_ids=shift_templates,
        time_off_requests=[],
        lookback_assignments=lookback,
        default_day_coverage=2,
        default_night_coverage=1,
    )

    result = solver.solve(mode="BALANCED", rank=1)
    assert result.status in ("OPTIMAL", "FEASIBLE")

    assign_map = {(a["staff_id"], a["date"]): a["shift_code"] for a in result.assignments}
    d1_str = date(2026, 11, 1).isoformat()

    # rn-1은 11/1에 반드시 OFF여야 함 (11시간 최소 휴식 보호)
    assert assign_map.get(("rn-1", d1_str)) == "OFF", f"전월 말 야간 근무자 rn-1에게 11/1 배정: {assign_map.get(('rn-1', d1_str))}"


def test_solver_work_burden_balancing(sample_staff, shift_templates):
    """부담점수제(Work Burden Points) 목적함수 최적화 및 정규화 편차 최소화 검증"""
    start = date(2026, 11, 1)
    end = date(2026, 11, 30)

    # rn-1에게 과거 3개월 이월 누적 부담 2.0점 가산 주입
    sample_staff[0].prior_burden_excess = 2.0

    solver = NurseScheduleSolver(
        start_date=start,
        end_date=end,
        staff_list=sample_staff,
        shift_template_ids=shift_templates,
        time_off_requests=[],
        default_day_coverage=2,
        default_night_coverage=1,
    )

    result = solver.solve(mode="BALANCED", rank=1)
    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert "burden_spread" in result.fairness_breakdown

    # 정규직 간호사 간 부담점수 편차가 6.0점 이내로 고르게 수렴해야 함
    burden_spread = result.fairness_breakdown["burden_spread"]
    assert burden_spread <= 6.0, f"정규직 간 부담점수 편차({burden_spread}점)가 너무 큼!"


def test_solver_infeasible_scenario(sample_staff, shift_templates):
    """인원 부족으로 인한 불가능 시나리오 사전 진단 검증"""
    start = date(2026, 11, 1)
    end = date(2026, 11, 5)

    heavy_leaves = [
        TimeOffInput(staff_id="rn-1", date=date(2026, 11, 3), type="ANNUAL_LEAVE"),
        TimeOffInput(staff_id="rn-2", date=date(2026, 11, 3), type="ANNUAL_LEAVE"),
        TimeOffInput(staff_id="rn-3", date=date(2026, 11, 3), type="ANNUAL_LEAVE"),
        TimeOffInput(staff_id="rn-4", date=date(2026, 11, 3), type="ANNUAL_LEAVE"),
        TimeOffInput(staff_id="rn-5", date=date(2026, 11, 3), type="ANNUAL_LEAVE"),
    ]

    solver = NurseScheduleSolver(
        start_date=start,
        end_date=end,
        staff_list=sample_staff,
        shift_template_ids=shift_templates,
        time_off_requests=heavy_leaves,
        default_day_coverage=2,
        default_night_coverage=1,
    )

    result = solver.solve(mode="BALANCED", rank=1)
    assert result.status == "INFEASIBLE"
    assert result.diagnostics is not None
    assert result.diagnostics["code"] == "INSUFFICIENT_STAFF"
