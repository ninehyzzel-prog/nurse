import datetime
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
import backend.app.models as models
from backend.app.database import SessionLocal

client = TestClient(app)


def test_validate_existing_seed_schedule():
    """시딩된 11월 1차 스케줄 검증 API 호출 테스트"""
    res = client.post("/api/schedule-versions/version-2026-11-v1/validate")
    assert res.status_code == 200
    report = res.json()
    assert report["version_id"] == "version-2026-11-v1"
    assert "is_feasible" in report
    assert "issues" in report


def test_h_rest_violation_rejection():
    """
    N(18:00~08:00) 근무 직후 익일 D(08:00, 휴식 0h) 또는 익일 N(18:00, 휴식 10시간) 배정 시도 시
    법정 최소 휴식 11시간(H-REST) 위반으로 422 에러 차단되는지 검증
    """
    db = SessionLocal()
    # 김간호사 (staff-1)의 11월 1일, 2일, 3일 배정 조회
    a_nov1 = (
        db.query(models.ShiftAssignment)
        .filter_by(schedule_version_id="version-2026-11-v1", staff_id="staff-1", local_start_date=datetime.date(2026, 11, 1))
        .first()
    )
    a_nov2 = (
        db.query(models.ShiftAssignment)
        .filter_by(schedule_version_id="version-2026-11-v1", staff_id="staff-1", local_start_date=datetime.date(2026, 11, 2))
        .first()
    )
    a_nov3 = (
        db.query(models.ShiftAssignment)
        .filter_by(schedule_version_id="version-2026-11-v1", staff_id="staff-1", local_start_date=datetime.date(2026, 11, 3))
        .first()
    )
    night_tmpl = db.query(models.ShiftTemplate).filter_by(code="NIGHT").first()
    off_tmpl = db.query(models.ShiftTemplate).filter_by(code="OFF").first()
    db.close()

    assert a_nov1 is not None and a_nov2 is not None and a_nov3 is not None
    assert night_tmpl is not None and off_tmpl is not None

    # 1) 11/2와 11/3을 먼저 OFF로 변경하여 안전한 상태로 만듦
    res_off2 = client.patch(
        f"/api/schedule-versions/version-2026-11-v1/assignments/{a_nov2.id}",
        json={"shift_template_id": off_tmpl.id},
    )
    assert res_off2.status_code == 200

    res_off3 = client.patch(
        f"/api/schedule-versions/version-2026-11-v1/assignments/{a_nov3.id}",
        json={"shift_template_id": off_tmpl.id},
    )
    assert res_off3.status_code == 200

    # 2) 이제 11/1을 NIGHT로 변경 성공
    res1 = client.patch(
        f"/api/schedule-versions/version-2026-11-v1/assignments/{a_nov1.id}",
        json={"shift_template_id": night_tmpl.id},
    )
    assert res1.status_code == 200

    # 3) 11/1 NIGHT (종료 11/2 08:00) 직후 11/2를 NIGHT(시작 11/2 18:00, 휴식 10시간 < 11시간)로 변경 시도 -> 422 차단!
    res2 = client.patch(
        f"/api/schedule-versions/version-2026-11-v1/assignments/{a_nov2.id}",
        json={"shift_template_id": night_tmpl.id},
    )
    assert res2.status_code == 422
    err_data = res2.json()["detail"]
    assert err_data["code"] == "LEGAL_FLOOR_VIOLATION"
    assert err_data["rule_code"] == "H-REST"
    assert "11시간" in err_data["message"]


def test_h_elig_violation_rejection():
    """
    야간 근무 불가 간호사(강간호사 staff-6)에게 NIGHT 배정 시도 시
    H-ELIG 위반으로 422 차단되는지 검증
    """
    db = SessionLocal()
    kang_assign = (
        db.query(models.ShiftAssignment)
        .filter_by(schedule_version_id="version-2026-11-v1", staff_id="staff-6")
        .first()
    )
    night_tmpl = db.query(models.ShiftTemplate).filter_by(code="NIGHT").first()
    db.close()

    assert kang_assign is not None
    assert night_tmpl is not None

    res = client.patch(
        f"/api/schedule-versions/version-2026-11-v1/assignments/{kang_assign.id}",
        json={"shift_template_id": night_tmpl.id},
    )
    assert res.status_code == 422
    err_data = res.json()["detail"]
    assert err_data["code"] == "LEGAL_FLOOR_VIOLATION"
    assert err_data["rule_code"] == "H-ELIG"
    assert "야간 근무 제한자" in err_data["message"]
