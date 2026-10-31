import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_generate_schedule_candidates():
    """OR-Tools CP-SAT 최적화 솔버 가동 및 3개 후보안 생성 API 테스트"""
    res = client.post("/api/schedule-periods/period-2026-11/generate?time_limit_seconds=5.0")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(data["candidates"]) == 3

    c1 = data["candidates"][0]
    assert c1["rank"] == 1
    assert "균형형" in c1["name"]
    assert c1["total_score"] >= 90.0
    assert len(c1["explanation_points"]) >= 3

    c2 = data["candidates"][1]
    assert c2["rank"] == 2
    assert "희망형" in c2["name"]

    c3 = data["candidates"][2]
    assert c3["rank"] == 3
    assert "피로" in c3["name"]

    # 후보 1안을 실제 근무표에 적용 테스트
    cand_id = c1["id"]
    apply_res = client.post(f"/api/schedule-periods/period-2026-11/apply-candidate/{cand_id}")
    assert apply_res.status_code == 200
    apply_data = apply_res.json()

    assert "Candidate 1 applied" in apply_data["message"]
    assert apply_data["applied_count"] > 0
    # 법적 최저 기준(11시간 휴식 등) 위반이 없어야 함
    assert apply_data["validation_report"]["is_feasible"] is True

    # 최신 실행 결과 조회 테스트
    latest_res = client.get("/api/schedule-periods/period-2026-11/runs/latest")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert latest_data["id"] == data["id"]
    assert len(latest_data["candidates"]) == 3


def test_generate_schedule_infeasible_scenario_api():
    """요구 인원이 병동 전체 가용 인원을 초과할 때 INFEASIBLE 진단 API 테스트"""
    res = client.post("/api/schedule-periods/period-2026-11/generate?time_limit_seconds=3.0&day_coverage=20&night_coverage=10")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "INFEASIBLE"
    assert data["diagnostics"] is not None
    assert "INSUFFICIENT" in data["diagnostics"]["code"] or "INFEASIBLE" in data["diagnostics"]["code"]

