from typing import List, Optional
import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class PriorityBreakdownOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    weekend_deficit_points: Decimal
    ungranted_points: Decimal
    burden_excess_points: Decimal
    importance_points: Decimal
    total_priority_points: Decimal


class TimeOffRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    staff_id: str
    staff_name: str
    request_type: str
    status: str
    dates: List[str]
    is_important: bool
    reason_note: Optional[str] = None
    submitted_at: datetime.datetime
    priority_points: Optional[Decimal] = None
    priority_breakdown: Optional[PriorityBreakdownOut] = None


class TimeOffRequestCreate(BaseModel):
    staff_id: str
    leave_type_code: str  # PREFERENCE_OFF, ANNUAL_LEAVE, PROTECTED_LEAVE
    dates: List[str]      # ['2026-11-14', ...]
    is_important: Optional[bool] = False
    reason_note: Optional[str] = None


class TimeOffDecisionRequest(BaseModel):
    decision: str  # APPROVED, NOT_GRANTED
    reviewer_id: str
    reason_note: Optional[str] = None
