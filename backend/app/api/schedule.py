import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
import backend.app.models as models
from backend.app.schemas.schedule import (
    SchedulePeriodOut,
    ScheduleVersionOut,
    ShiftAssignmentOut,
    ShiftAssignmentUpdate,
)

router = APIRouter(prefix="/api", tags=["Schedules"])


@router.get("/wards/{ward_id}/schedule-periods/{period_id}", response_model=SchedulePeriodOut)
def get_schedule_period(ward_id: str, period_id: str, db: Session = Depends(get_db)):
    """특정 기간의 근무표와 배정 매트릭스 조회"""
    period = db.query(models.SchedulePeriod).filter_by(id=period_id, ward_id=ward_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Schedule period not found")

    latest_ver = (
        db.query(models.ScheduleVersion)
        .filter(models.ScheduleVersion.schedule_period_id == period.id)
        .order_by(models.ScheduleVersion.version_number.desc())
        .first()
    )

    ver_out = None
    if latest_ver:
        assignments_out = []
        for a in latest_ver.assignments:
            tmpl = a.template_version.shift_template if a.template_version else None
            assignments_out.append(
                ShiftAssignmentOut(
                    id=a.id,
                    schedule_version_id=a.schedule_version_id,
                    staff_id=a.staff_id,
                    shift_template_id=tmpl.id if tmpl else "",
                    shift_template_code=tmpl.code if tmpl else "OFF",
                    local_start_date=a.local_start_date.strftime("%Y-%m-%d"),
                    start_at_utc=a.start_at_utc,
                    end_at_utc=a.end_at_utc,
                    is_pinned=a.is_pinned,
                    source=a.source,
                    note=a.note,
                )
            )

        ver_out = ScheduleVersionOut(
            id=latest_ver.id,
            schedule_period_id=latest_ver.schedule_period_id,
            version_number=latest_ver.version_number,
            status=latest_ver.status,
            published_at=latest_ver.published_at,
            created_at=latest_ver.created_at,
            assignments=assignments_out,
        )

    return SchedulePeriodOut(
        id=period.id,
        ward_id=period.ward_id,
        start_date=period.start_date,
        end_date=period.end_date,
        status=period.status,
        current_version=ver_out,
    )


@router.patch("/schedule-versions/{version_id}/assignments/{assignment_id}")
def update_assignment(
    version_id: str,
    assignment_id: str,
    body: ShiftAssignmentUpdate,
    db: Session = Depends(get_db),
):
    """특정 셀의 근무 배정 수정 및 핀 토글"""
    assign = (
        db.query(models.ShiftAssignment)
        .filter_by(id=assignment_id, schedule_version_id=version_id)
        .first()
    )
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")

    tmpl = db.query(models.ShiftTemplate).filter_by(id=body.shift_template_id).first()
    if not tmpl:
        raise HTTPException(status_code=400, detail="Invalid shift template")

    tmpl_ver = tmpl.versions[-1] if tmpl.versions else None
    if not tmpl_ver:
        raise HTTPException(status_code=400, detail="Shift template version missing")

    assign.shift_template_version_id = tmpl_ver.id
    if body.is_pinned is not None:
        assign.is_pinned = body.is_pinned
        assign.source = "PINNED" if body.is_pinned else "MANUAL"
    else:
        assign.source = "MANUAL"

    if body.note is not None:
        assign.note = body.note

    db.commit()
    return {"message": "Assignment updated", "id": assign.id, "source": assign.source}


@router.post("/schedule-versions/{version_id}/publish")
def publish_schedule_version(version_id: str, db: Session = Depends(get_db)):
    """근무표 최종 확정 발행 (PUBLISH)"""
    ver = db.query(models.ScheduleVersion).filter_by(id=version_id).first()
    if not ver:
        raise HTTPException(status_code=404, detail="Schedule version not found")

    ver.status = "PUBLISHED"
    ver.published_at = datetime.datetime.utcnow()

    # 상위 period 상태도 CONFIRMED로 변경
    if ver.period:
        ver.period.status = "CONFIRMED"

    # 감사 로그 기록
    db.add(
        models.AuditLog(
            id=f"audit-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            actor_id=ver.created_by,
            action="PUBLISH_SCHEDULE",
            entity_type="SCHEDULE_VERSION",
            entity_id=version_id,
            after_json='{"status": "PUBLISHED"}',
        )
    )

    db.commit()
    return {"message": "Schedule version published successfully", "version_id": ver.id}
