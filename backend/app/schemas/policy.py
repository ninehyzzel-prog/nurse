from typing import List, Optional
import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class PolicyRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    rule_type: str
    parameter_json: str
    hard_soft: str
    weight: Decimal
    legal_floor: bool
    justification: Optional[str] = None


class PolicyVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    ward_id: str
    version: int
    status: str
    published_at: Optional[datetime.datetime] = None
    effective_from: datetime.date
    rules: List[PolicyRuleOut] = []


class PolicyPublishRequest(BaseModel):
    effective_from: datetime.date
    change_reason: Optional[str] = None
