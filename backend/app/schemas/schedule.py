from typing import List, Optional
import datetime
from pydantic import BaseModel, ConfigDict


class ShiftAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    schedule_version_id: str
    staff_id: str
    shift_template_id: str
    shift_template_code: str
    local_start_date: str
    start_at_utc: datetime.datetime
    end_at_utc: datetime.datetime
    is_pinned: bool
    source: str
    note: Optional[str] = None


class ShiftAssignmentUpdate(BaseModel):
    shift_template_id: str
    is_pinned: Optional[bool] = None
    note: Optional[str] = None


class ScheduleVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    schedule_period_id: str
    version_number: int
    status: str
    published_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    assignments: List[ShiftAssignmentOut] = []


class SchedulePeriodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    ward_id: str
    start_date: datetime.date
    end_date: datetime.date
    status: str
    current_version: Optional[ScheduleVersionOut] = None
