from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
import backend.app.models as models

router = APIRouter(prefix="/api", tags=["Auth & Me"])


@router.get("/me")
def get_current_user(
    as_role: str = Query("NURSE", description="데모 전환용 역할 (NURSE 또는 SCHEDULER)"),
    db: Session = Depends(get_db),
):
    """현재 로그인한 사용자 정보 및 권한 반환 (비공개 필드 마스킹)"""
    if as_role == "SCHEDULER":
        user = db.query(models.User).filter_by(role="SCHEDULER").first()
        staff = None
    else:
        # 기본 간호사: 김간호사 (staff-1)
        staff = db.query(models.StaffProfile).filter_by(id="staff-1").first()
        user = staff.user if staff else None

    if not user:
        return {"error": "User not found"}

    return {
        "user_id": user.id,
        "login_id": user.login_id,
        "role": user.role,
        "ward_id": "ward-obgyn",
        "staff_profile": {
            "id": staff.id,
            "display_name": staff.display_name,
            "staff_code": staff.staff_code,
        } if staff else None,
    }
