import datetime
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
import backend.app.models as models
from backend.app.schemas.shift import ShiftTemplateOut, ShiftTemplateCreate, ShiftTemplateVersionOut

router = APIRouter(prefix="/api", tags=["Shift Templates"])


@router.get("/wards/{ward_id}/shift-templates", response_model=List[ShiftTemplateOut])
def list_shift_templates(ward_id: str, db: Session = Depends(get_db)):
    """병동 교대 근무 템플릿 및 최신 버전 조회"""
    templates = (
        db.query(models.ShiftTemplate)
        .filter(models.ShiftTemplate.ward_id == ward_id)
        .order_by(models.ShiftTemplate.sort_order)
        .all()
    )

    result = []
    for t in templates:
        latest_ver = t.versions[-1] if t.versions else None
        ver_out = (
            ShiftTemplateVersionOut(
                id=latest_ver.id,
                starts_at_local=latest_ver.starts_at_local,
                ends_at_local=latest_ver.ends_at_local,
                end_day_offset=latest_ver.end_day_offset,
                break_minutes=latest_ver.break_policy.default_break_minutes if latest_ver.break_policy else 60,
                base_burden_points=latest_ver.base_burden_points,
                version=latest_ver.version,
            )
            if latest_ver
            else None
        )

        result.append(
            ShiftTemplateOut(
                id=t.id,
                ward_id=t.ward_id,
                code=t.code,
                label=t.label,
                color_token=t.color_token,
                sort_order=t.sort_order,
                is_assignable=t.is_assignable,
                is_active=t.is_active,
                current_version=ver_out,
            )
        )
    return result


@router.post("/wards/{ward_id}/shift-templates", response_model=ShiftTemplateOut, status_code=status.HTTP_201_CREATED)
def create_shift_template(ward_id: str, body: ShiftTemplateCreate, db: Session = Depends(get_db)):
    """신규 교대 템플릿 추가 (3교대 확장 등)"""
    new_tmpl_id = f"shift-{body.code.lower()}"
    tmpl = models.ShiftTemplate(
        id=new_tmpl_id,
        ward_id=ward_id,
        code=body.code,
        label=body.label,
        color_token=body.color_token,
        sort_order=body.sort_order or 0,
        is_assignable=True,
        is_active=True,
    )
    db.add(tmpl)
    db.flush()

    ver = models.ShiftTemplateVersion(
        id=f"{new_tmpl_id}-v1",
        shift_template_id=new_tmpl_id,
        starts_at_local=body.starts_at_local,
        ends_at_local=body.ends_at_local,
        end_day_offset=body.end_day_offset or 0,
        break_policy_id="bp-standard",
        base_burden_points=body.base_burden_points or 1.0,
        version=1,
        effective_from=datetime.date.today(),
    )
    db.add(ver)
    db.commit()

    ver_out = ShiftTemplateVersionOut(
        id=ver.id,
        starts_at_local=ver.starts_at_local,
        ends_at_local=ver.ends_at_local,
        end_day_offset=ver.end_day_offset,
        break_minutes=60,
        base_burden_points=ver.base_burden_points,
        version=ver.version,
    )

    return ShiftTemplateOut(
        id=tmpl.id,
        ward_id=tmpl.ward_id,
        code=tmpl.code,
        label=tmpl.label,
        color_token=tmpl.color_token,
        sort_order=tmpl.sort_order,
        is_assignable=tmpl.is_assignable,
        is_active=tmpl.is_active,
        current_version=ver_out,
    )
