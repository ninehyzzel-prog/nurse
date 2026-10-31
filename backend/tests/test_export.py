import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_export_schedule_excel_api():
    """엑셀(.xlsx) 공식 서식 다운로드 API 테스트"""
    res = client.get("/api/schedule-versions/version-2026-11-v1/export/excel")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "attachment; filename=" in res.headers["content-disposition"]
    # 바이너리 내용 확인 (PK zip signature: 50 4B 03 04)
    content = res.content
    assert len(content) > 1000
    assert content[:4] == b"PK\x03\x04"


def test_export_schedule_csv_api():
    """한국어 엑셀 호환 UTF-8-BOM CSV 다운로드 API 테스트"""
    res = client.get("/api/schedule-versions/version-2026-11-v1/export/csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]

    # BOM 및 내용 검증
    content_bytes = res.content
    assert content_bytes.startswith(b"\xef\xbb\xbf")  # UTF-8 BOM
    decoded = content_bytes.decode("utf-8-sig")
    assert "사번" in decoded
    assert "성명" in decoded
    assert "김간호사 (책임)" in decoded
