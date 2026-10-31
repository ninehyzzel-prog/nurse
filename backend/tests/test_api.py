import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_get_me():
    # 간호사 모드
    res = client.get("/api/me?as_role=NURSE")
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "NURSE"
    assert data["staff_profile"]["display_name"] == "김간호사 (책임)"

    # 수간호사 모드
    res_admin = client.get("/api/me?as_role=SCHEDULER")
    assert res_admin.status_code == 200
    assert res_admin.json()["role"] == "SCHEDULER"


def test_list_staff():
    res = client.get("/api/wards/ward-obgyn/staff")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 6
    names = [s["display_name"] for s in data]
    assert "김간호사 (책임)" in names
    assert "강간호사 (단시간)" in names


def test_create_and_update_staff():
    # 신규 등록 (고유 코드 사용)
    unique_suffix = uuid.uuid4().hex[:6].upper()
    new_staff_payload = {
        "display_name": f"테스트간호사_{unique_suffix}",
        "staff_code": f"RN-TEST-{unique_suffix}",
        "role": "NURSE",
        "employment_type": "SHIFT",
        "target_work_minutes": 9600,
        "can_work_night": True,
        "skill_tags": ["CHARGE_CAPABLE"],
    }
    res = client.post("/api/wards/ward-obgyn/staff", json=new_staff_payload)
    assert res.status_code == 201
    created = res.json()
    assert created["display_name"] == f"테스트간호사_{unique_suffix}"
    staff_id = created["id"]

    # 수정
    res_update = client.patch(f"/api/staff/{staff_id}", json={"display_name": "수정간호사", "can_work_night": False})
    assert res_update.status_code == 200
    updated = res_update.json()
    assert updated["display_name"] == "수정간호사"
    assert updated["can_work_night"] is False


def test_shift_templates_and_create():
    # 목록 조회
    res = client.get("/api/wards/ward-obgyn/shift-templates")
    assert res.status_code == 200
    templates = res.json()
    codes = [t["code"] for t in templates]
    assert "DAY" in codes
    assert "NIGHT" in codes
    assert "OFF" in codes

    # 3교대 이브닝 신규 템플릿 생성 (고유 코드 사용)
    unique_code = f"EVE_{uuid.uuid4().hex[:4].upper()}"
    evening_payload = {
        "code": unique_code,
        "label": "이브닝 (E)",
        "color_token": "shift-evening",
        "starts_at_local": "14:00",
        "ends_at_local": "23:00",
        "end_day_offset": 0,
        "break_minutes": 60,
        "base_burden_points": 1.30,
    }
    res_create = client.post("/api/wards/ward-obgyn/shift-templates", json=evening_payload)
    assert res_create.status_code == 201
    assert res_create.json()["code"] == unique_code


def test_policies_and_publish():
    res = client.get("/api/wards/ward-obgyn/policies")
    assert res.status_code == 200
    policies = res.json()
    assert len(policies) >= 1
    v1 = policies[-1]
    assert v1["version"] >= 1
    # H-REST 제약이 legal_floor=True인지 검증
    rest_rule = next(r for r in v1["rules"] if r["rule_type"] == "H-REST")
    assert rest_rule["legal_floor"] is True

    # 새 버전 발행
    pub_res = client.post("/api/wards/ward-obgyn/policies/publish", json={"effective_from": "2026-12-01"})
    assert pub_res.status_code == 200
    assert pub_res.json()["version"] > v1["version"]


def test_time_off_requests_and_priority_scores():
    # 오프 신청 목록 조회
    res = client.get("/api/wards/ward-obgyn/time-off-requests")
    assert res.status_code == 200
    reqs = res.json()
    assert len(reqs) >= 2

    # QA-SCORE-02 경합 점수 검증 (김간호사 35점, 이간호사 26점)
    req1 = next(r for r in reqs if r["id"] == "req-1")
    req2 = next(r for r in reqs if r["id"] == "req-2")
    assert float(req1["priority_points"]) == 35.0
    assert float(req2["priority_points"]) == 26.0

    # 신규 신청 접수
    new_req_payload = {
        "staff_id": "staff-3",
        "leave_type_code": "PREFERENCE_OFF",
        "dates": ["2026-11-20"],
        "is_important": True,
        "reason_note": "테스트 신청",
    }
    res_apply = client.post("/api/wards/ward-obgyn/time-off-requests", json=new_req_payload)
    assert res_apply.status_code == 201
    created_req = res_apply.json()
    assert created_req["status"] == "SUBMITTED"
    assert created_req["is_important"] is True

    # 승인 결정
    res_decide = client.post(
        f"/api/time-off-requests/{created_req['id']}/decision",
        json={"decision": "APPROVED", "reviewer_id": "user-headnurse", "reason_note": "정상 승인"},
    )
    assert res_decide.status_code == 200
    assert res_decide.json()["status"] == "APPROVED"


def test_schedule_period_and_assignments():
    # 11월 근무표 조회
    res = client.get("/api/wards/ward-obgyn/schedule-periods/period-2026-11")
    assert res.status_code == 200
    period = res.json()
    version = period["current_version"]
    assert version is not None
    assert len(version["assignments"]) >= 180  # 6명 x 30일 = 180건

    # 단일 셀 수정 및 핀 고정
    first_assign = version["assignments"][0]
    update_payload = {
        "shift_template_id": "shift-night",
        "is_pinned": True,
        "note": "수동 변경 테스트",
    }
    res_patch = client.patch(
        f"/api/schedule-versions/{version['id']}/assignments/{first_assign['id']}",
        json=update_payload,
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["source"] == "PINNED"

    # 최종 확정 발행 (PUBLISH) - 미달 사항이 있으면 force=False 시 400 반환 검증
    res_pub_blocked = client.post(f"/api/schedule-versions/{version['id']}/publish")
    if res_pub_blocked.status_code == 400:
        assert "하드 제약 조건 위반 사항" in res_pub_blocked.json()["detail"]["message"]
        # 관리자 승인(force=True)으로 확정 발행
        res_pub = client.post(f"/api/schedule-versions/{version['id']}/publish?force=true&override_reason=수간호사+사전승인")
        assert res_pub.status_code == 200
        assert "published successfully" in res_pub.json()["message"]
    else:
        assert res_pub_blocked.status_code == 200


def test_fairness_analytics():
    res = client.get("/api/wards/ward-obgyn/fairness")
    assert res.status_code == 200
    data = res.json()
    assert data["overall_fairness_score"] > 80.0
    assert len(data["staff_metrics"]) >= 6
