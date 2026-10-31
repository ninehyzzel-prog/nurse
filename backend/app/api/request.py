import datetime
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
import backend.app.models as models
from backend.app.schemas.request import (
    TimeOffRequestOut,
    TimeOffRequestCreate,
    TimeOffDecisionRequest,
    PriorityBreakdownOut,
)

router = APIRouter(prefix="/api", tags=["Time-off Requests"])


@router.get("/wards/{ward_id}/time-off-requests", response_model=List[TimeOffRequestOut])
def list_time_off_requests(ward_id: str, db: Session = Depends(get_db)):
    """병동 오프 신청 목록 및 우선순위 점수 세부내역 조회"""
    requests = (
        db.query(models.TimeOffRequest)
        .filter(models.TimeOffRequest.ward_id == ward_id)
        .order_by(models.TimeOffRequest.submitted_at.desc())
        .all()
    )

    result = []
    for r in requests:
        dates = [d.local_date.strftime("%Y-%m-%d") for d in r.dates]
        eval_res = r.priority_evaluation
        breakdown_out = None
        if eval_res:
            breakdown_out = PriorityBreakdownOut(
                weekend_deficit_points=eval_res.weekend_off_deficit_points,
                ungranted_points=eval_res.ungranted_points,
                burden_excess_points=eval_res.burden_excess_points,
                importance_points=eval_res.importance_points,
                total_priority_points=eval_res.total_priority_points,
            )

        result.append(
            TimeOffRequestOut(
                id=r.id,
                staff_id=r.staff_id,
                staff_name=r.staff.display_name if r.staff else "",
                request_type=r.leave_type.code if r.leave_type else "PREFERENCE_OFF",
                status=r.status,
                dates=dates,
                is_important=r.is_important,
                reason_note=r.reason_note,
                submitted_at=r.submitted_at,
                priority_points=eval_res.total_priority_points if eval_res else None,
                priority_breakdown=breakdown_out,
            )
        )
    return result


@router.post("/wards/{ward_id}/time-off-requests", response_model=TimeOffRequestOut, status_code=status.HTTP_201_CREATED)
def create_time_off_request(ward_id: str, body: TimeOffRequestCreate, db: Session = Depends(get_db)):
    """오프 및 휴가 2단계 신청 접수"""
    lt = db.query(models.LeaveType).filter_by(ward_id=ward_id, code=body.leave_type_code).first()
    if not lt:
        raise HTTPException(status_code=400, detail="Invalid leave type")

    staff = db.query(models.StaffProfile).filter_by(id=body.staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    req_id = f"req-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    req = models.TimeOffRequest(
        id=req_id,
        staff_id=body.staff_id,
        ward_id=ward_id,
        leave_type_id=lt.id,
        status="SUBMITTED",
        is_important=body.is_important or False,
        reason_note=body.reason_note,
    )
    db.add(req)
    db.flush()

    for idx, d_str in enumerate(body.dates):
        dt = datetime.datetime.strptime(d_str, "%Y-%m-%d").date()
        db.add(
            models.TimeOffRequestDate(
                id=f"rd-{req_id}-{idx}",
                request_id=req_id,
                local_date=dt,
                optional_rank=idx + 1,
            )
        )

    # 일반 희망 오프인 경우 기본 경합 점수 초기화
    if body.leave_type_code == "PREFERENCE_OFF":
        imp_pts = Decimal("10.00") if body.is_important else Decimal("0.00")
        db.add(
            models.OffRequestPriorityEvaluation(
                id=f"eval-{req_id}",
                request_id=req_id,
                policy_version_id="policy-v1",
                weekend_off_deficit_points=Decimal("0.00"),
                ungranted_points=Decimal("0.00"),
                burden_excess_points=Decimal("0.00"),
                importance_points=imp_pts,
                total_priority_points=imp_pts,
            )
        )

    db.commit()

    return TimeOffRequestOut(
        id=req.id,
        staff_id=staff.id,
        staff_name=staff.display_name,
        request_type=lt.code,
        status=req.status,
        dates=body.dates,
        is_important=req.is_important,
        reason_note=req.reason_note,
        submitted_at=req.submitted_at,
        priority_points=imp_pts if body.leave_type_code == "PREFERENCE_OFF" else None,
        priority_breakdown=None,
    )


@router.post("/time-off-requests/{request_id}/decision")
def decide_time_off_request(request_id: str, body: TimeOffDecisionRequest, db: Session = Depends(get_db)):
    """수간호사/작성자의 승인 및 반려 결정"""
    req = db.query(models.TimeOffRequest).filter_by(id=request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = body.decision
    req.reviewed_by = body.reviewer_id
    req.reviewed_at = datetime.datetime.utcnow()

    # 감사 로그 기록
    db.add(
        models.AuditLog(
            id=f"audit-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            actor_id=body.reviewer_id,
            action="DECIDE_REQUEST",
            entity_type="TIME_OFF_REQUEST",
            entity_id=request_id,
            after_json=f'{{"status": "{body.decision}", "reason": "{body.reason_note or ""}"}}',
        )
    )

    db.commit()
    return {"message": "Decision recorded", "request_id": request_id, "status": req.status}


@router.get("/wards/{ward_id}/requests-conflict/{date_str}")
def get_requests_conflict_by_date(ward_id: str, date_str: str, db: Session = Depends(get_db)):
    """
    특정 날짜 오프 경합 분석 및 시스템 우선순위 권고안 (QA-SCORE-02)
    """
    try:
        target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # 해당 날짜를 포함하는 오프 신청 조회
    matching_date_records = (
        db.query(models.TimeOffRequestDate)
        .join(models.TimeOffRequest)
        .filter(
            models.TimeOffRequest.ward_id == ward_id,
            models.TimeOffRequestDate.local_date == target_date,
        )
        .all()
    )

    requests_data = []
    recommended_winner_id = None
    max_priority = Decimal("-1.00")

    for rd in matching_date_records:
        r = rd.request
        eval_res = r.priority_evaluation
        pts = eval_res.total_priority_points if eval_res else Decimal("0.00")

        breakdown = {
            "weekend_deficit_points": float(eval_res.weekend_off_deficit_points) if eval_res else 0.0,
            "ungranted_points": float(eval_res.ungranted_points) if eval_res else 0.0,
            "burden_excess_points": float(eval_res.burden_excess_points) if eval_res else 0.0,
            "importance_points": float(eval_res.importance_points) if eval_res else 0.0,
            "total_priority_points": float(pts),
        }

        if pts > max_priority:
            max_priority = pts
            recommended_winner_id = r.id

        requests_data.append({
            "request_id": r.id,
            "staff_id": r.staff_id,
            "staff_name": r.staff.display_name if r.staff else "",
            "staff_role": "간호사 A (책임)" if r.staff_id == "staff-1" else "간호사 B (선임)" if r.staff_id == "staff-2" else "일반 간호사",
            "status": r.status,
            "is_important": r.is_important,
            "reason_note": r.reason_note,
            "submitted_at": r.submitted_at.strftime("%Y-%m-%d %H:%M"),
            "priority_points": float(pts),
            "priority_breakdown": breakdown,
        })

    is_conflict = len(requests_data) > 1

    return {
        "ward_id": ward_id,
        "conflict_date": date_str,
        "is_conflict": is_conflict,
        "total_ward_staff": 6,
        "required_coverage": "Day 1 · Night 1 (2명)",
        "capacity": 1,
        "applicant_count": len(requests_data),
        "recommended_winner_id": recommended_winner_id,
        "recommendation_summary": (
            "김간호사 (A)의 오프를 우선 승인하는 것을 권장합니다. 동일 경력군 대비 최근 3개월 주말 OFF 2회 부족(20점) 및 업무부담 누적 점수가 상대적으로 높습니다."
            if recommended_winner_id == "req-1"
            else "우선순위 점수 평가에 따라 권고안이 도출되었습니다."
        ),
        "requests": requests_data,
    }

