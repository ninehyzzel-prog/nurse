import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
import backend.app.models as models
from backend.app.schemas.staff import StaffOut, StaffCreate, StaffUpdate

router = APIRouter(prefix="/api", tags=["Staff"])


@router.get("/wards/{ward_id}/staff", response_model=List[StaffOut])
def list_ward_staff(ward_id: str, db: Session = Depends(get_db)):
    """병동 소속 직원 목록 조회"""
    memberships = (
        db.query(models.WardMembership)
        .filter(models.WardMembership.ward_id == ward_id)
        .all()
    )
    user_ids = [m.user_id for m in memberships]

    profiles = (
        db.query(models.StaffProfile)
        .filter(models.StaffProfile.user_id.in_(user_ids))
        .all()
    )

    result = []
    for p in profiles:
        emp = p.employment_periods[0] if p.employment_periods else None
        skills = [sp.skill.code for sp in p.skill_periods if sp.skill]
        result.append(
            StaffOut(
                id=p.id,
                display_name=p.display_name,
                staff_code=p.staff_code,
                role=p.user.role if p.user else "NURSE",
                active_status=p.active_status,
                employment_type=emp.employment_type if emp else "SHIFT",
                target_work_minutes=emp.target_work_minutes_per_period if emp else 9600,
                can_work_night=emp.can_work_night if emp else True,
                skill_tags=skills,
            )
        )
    return result


@router.post("/wards/{ward_id}/staff", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(ward_id: str, body: StaffCreate, db: Session = Depends(get_db)):
    """신규 간호사 등록 마법사"""
    new_user_id = f"user-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    new_staff_id = f"staff-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"

    # 1. User
    user = models.User(
        id=new_user_id,
        login_id=body.staff_code.lower(),
        password_hash="temp_hash",
        role=body.role or "NURSE",
    )
    db.add(user)
    db.flush()

    # 2. Staff Profile
    staff = models.StaffProfile(
        id=new_staff_id,
        user_id=new_user_id,
        display_name=body.display_name,
        staff_code=body.staff_code,
        active_status="ACTIVE",
        joined_on=datetime.date.today(),
    )
    db.add(staff)
    db.flush()

    # 3. Ward Membership
    db.add(
        models.WardMembership(
            id=f"mem-{new_staff_id}",
            ward_id=ward_id,
            user_id=new_user_id,
            role=body.role or "NURSE",
            effective_from=datetime.date.today(),
        )
    )

    # 4. Employment Period
    db.add(
        models.StaffEmploymentPeriod(
            id=f"emp-{new_staff_id}",
            staff_id=new_staff_id,
            ward_id=ward_id,
            employment_type=body.employment_type or "SHIFT",
            target_work_minutes_per_period=body.target_work_minutes or 9600,
            can_work_night=body.can_work_night if body.can_work_night is not None else True,
            effective_from=datetime.date.today(),
        )
    )

    # 5. Skills
    for tag in body.skill_tags or []:
        sk = db.query(models.Skill).filter_by(code=tag).first()
        if sk:
            db.add(
                models.StaffSkillPeriod(
                    id=f"sp-{new_staff_id}-{sk.id}",
                    staff_id=new_staff_id,
                    skill_id=sk.id,
                    proficiency_level="COMPETENT",
                    valid_from=datetime.date.today(),
                )
            )

    db.commit()

    return StaffOut(
        id=staff.id,
        display_name=staff.display_name,
        staff_code=staff.staff_code,
        role=user.role,
        active_status=staff.active_status,
        employment_type=body.employment_type or "SHIFT",
        target_work_minutes=body.target_work_minutes or 9600,
        can_work_night=body.can_work_night if body.can_work_night is not None else True,
        skill_tags=body.skill_tags or [],
    )


@router.patch("/staff/{staff_id}", response_model=StaffOut)
def update_staff(staff_id: str, body: StaffUpdate, db: Session = Depends(get_db)):
    """간호사 정보 수정 및 비활성화 (소프트 삭제)"""
    staff = db.query(models.StaffProfile).filter_by(id=staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    if body.display_name is not None:
        staff.display_name = body.display_name
    if body.active_status is not None:
        staff.active_status = body.active_status

    emp = staff.employment_periods[0] if staff.employment_periods else None
    if emp:
        if body.employment_type is not None:
            emp.employment_type = body.employment_type
        if body.target_work_minutes is not None:
            emp.target_work_minutes_per_period = body.target_work_minutes
        if body.can_work_night is not None:
            emp.can_work_night = body.can_work_night

    db.commit()

    skills = [sp.skill.code for sp in staff.skill_periods if sp.skill]
    return StaffOut(
        id=staff.id,
        display_name=staff.display_name,
        staff_code=staff.staff_code,
        role=staff.user.role if staff.user else "NURSE",
        active_status=staff.active_status,
        employment_type=emp.employment_type if emp else "SHIFT",
        target_work_minutes=emp.target_work_minutes_per_period if emp else 9600,
        can_work_night=emp.can_work_night if emp else True,
        skill_tags=skills,
    )
