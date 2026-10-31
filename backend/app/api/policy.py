import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
import backend.app.models as models
from backend.app.schemas.policy import PolicyVersionOut, PolicyRuleOut, PolicyPublishRequest

router = APIRouter(prefix="/api", tags=["Policies"])


@router.get("/wards/{ward_id}/policies", response_model=List[PolicyVersionOut])
def list_ward_policies(ward_id: str, db: Session = Depends(get_db)):
    """병동 정책 버전 목록 및 세부 규칙 조회"""
    policies = (
        db.query(models.PolicyVersion)
        .filter(models.PolicyVersion.ward_id == ward_id)
        .order_by(models.PolicyVersion.version.desc())
        .all()
    )

    result = []
    for p in policies:
        rules_out = [
            PolicyRuleOut(
                id=r.id,
                rule_type=r.rule_type,
                parameter_json=r.parameter_json,
                hard_soft=r.hard_soft,
                weight=r.weight,
                legal_floor=r.legal_floor,
                justification=r.justification,
            )
            for r in p.rules
        ]
        result.append(
            PolicyVersionOut(
                id=p.id,
                ward_id=p.ward_id,
                version=p.version,
                status=p.status,
                published_at=p.published_at,
                effective_from=p.effective_from,
                rules=rules_out,
            )
        )
    return result


@router.post("/wards/{ward_id}/policies/publish", response_model=PolicyVersionOut)
def publish_new_policy_version(ward_id: str, body: PolicyPublishRequest, db: Session = Depends(get_db)):
    """새 정책 버전 발행 (과거 버전 불변 보존)"""
    latest = (
        db.query(models.PolicyVersion)
        .filter(models.PolicyVersion.ward_id == ward_id)
        .order_by(models.PolicyVersion.version.desc())
        .first()
    )
    next_ver_num = (latest.version + 1) if latest else 1

    new_pv = models.PolicyVersion(
        id=f"policy-v{next_ver_num}",
        ward_id=ward_id,
        version=next_ver_num,
        status="PUBLISHED",
        created_by="user-headnurse",
        published_at=datetime.datetime.utcnow(),
        effective_from=body.effective_from,
    )
    db.add(new_pv)
    db.flush()

    # 기존 룰 복제 (스냅샷)
    if latest:
        for r in latest.rules:
            db.add(
                models.PolicyRule(
                    id=f"{r.id}-v{next_ver_num}",
                    policy_version_id=new_pv.id,
                    rule_type=r.rule_type,
                    parameter_json=r.parameter_json,
                    hard_soft=r.hard_soft,
                    weight=r.weight,
                    legal_floor=r.legal_floor,
                    justification=r.justification,
                )
            )

    db.commit()

    return PolicyVersionOut(
        id=new_pv.id,
        ward_id=new_pv.ward_id,
        version=new_pv.version,
        status=new_pv.status,
        published_at=new_pv.published_at,
        effective_from=new_pv.effective_from,
        rules=[],
    )
