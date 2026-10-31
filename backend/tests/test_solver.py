import pytest
from datetime import date
from backend.app.services.nurse_solver import (
    NurseScheduleSolver,
    StaffInput,
    TimeOffInput,
    PinnedInput,
)


@pytest.fixture
def sample_staff():
    return [
        StaffInput(id="rn-1", name="이은솔", can_night=True, recent_night_count=8, recent_weekend_count=2),
        StaffInput(id="rn-2", name="김지은", can_night=True, recent_night_count=7, recent_weekend_count=3),
        StaffInput(id="rn-3", name="박수민", can_night=True, recent_night_count=8, recent_weekend_count=3),
        StaffInput(id="rn-4", name="최서연", can_night=True, recent_night_count=9, recent_weekend_count=2),
        StaffInput(id="rn-5", name="정하윤", can_night=True, recent_night_count=6, recent_weekend_count=4),
        StaffInput(id="rn-6", name="이민지", can_night=False, recent_night_count=0, recent_weekend_count=1),  # 임산부/야간불가
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

    # 10월 10일 오프 신청 3건
    time_offs = [
        TimeOffInput(staff_id="rn-1", date=date(2026, 11, 10), type="PREFERENCE_OFF", priority_points=85),
        TimeOffInput(staff_id="rn-2", date=date(2026, 11, 10), type="PREFERENCE_OFF", priority_points=67),
        TimeOffInput(staff_id="rn-3", date=date(2026, 11, 10), type="PREFERENCE_OFF", priority_points=62),
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

    # 배정 결과 매핑
    assign_map = {}
    for a in result.assignments:
        assign_map[(a["staff_id"], a["date"])] = a["shift_code"]

    # 1. 법적 11시간 최소 휴식 검증: N 다음날 D 배정이 0건이어야 함
    for s in sample_staff:
        for day in range(1, 30):
            d1 = date(2026, 11, day).isoformat()
            d2 = date(2026, 11, day + 1).isoformat()
            if assign_map.get((s.id, d1)) == "NIGHT":
                assert assign_map.get((s.id, d2)) != "DAY", f"{s.name} 간호사 {d1} 야간 후 {d2} 주간 배정 위반!"

    # 2. 야간 불가자(임산부) 검증: rn-6는 야간 배정이 0건이어야 함
    for day in range(1, 31):
        d_str = date(2026, 11, day).isoformat()
        assert assign_map.get(("rn-6", d_str)) != "NIGHT", f"야간 불가자 rn-6에게 {d_str} 야간 배정 위반!"

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


def test_solver_preference_and_fatigue_modes(sample_staff, shift_templates):
    """희망형(PREFERENCE) 및 피로최소형(FATIGUE_MIN) 모드 검증"""
    start = date(2026, 11, 1)
    end = date(2026, 11, 15)  # 15일

    solver = NurseScheduleSolver(
        start_date=start,
        end_date=end,
        staff_list=sample_staff,
        shift_template_ids=shift_templates,
        time_off_requests=[],
    )

    res_pref = solver.solve(mode="PREFERENCE", rank=2)
    assert res_pref.status in ("OPTIMAL", "FEASIBLE")
    assert res_pref.rank == 2

    res_fatigue = solver.solve(mode="FATIGUE_MIN", rank=3)
    assert res_fatigue.status in ("OPTIMAL", "FEASIBLE")
    assert res_fatigue.rank == 3


def test_solver_infeasible_scenario(sample_staff, shift_templates):
    """인원 부족으로 인한 불가능 시나리오 사전 진단 검증"""
    start = date(2026, 11, 1)
    end = date(2026, 11, 5)

    # 11월 3일에 6명 중 5명이 승인된 연차 휴가 -> 잔여 인원 1명 (필수 3명 필요)
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
    assert "가용 인원" in result.diagnostics["message"]
