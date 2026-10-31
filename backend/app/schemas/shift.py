from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class ShiftTemplateVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    starts_at_local: str
    ends_at_local: str
    end_day_offset: int
    break_minutes: int
    base_burden_points: Decimal
    version: int


class ShiftTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    ward_id: str
    code: str
    label: str
    color_token: str
    sort_order: int
    is_assignable: bool
    is_active: bool
    current_version: Optional[ShiftTemplateVersionOut] = None


class ShiftTemplateCreate(BaseModel):
    code: str
    label: str
    color_token: str
    starts_at_local: str
    ends_at_local: str
    end_day_offset: Optional[int] = 0
    break_minutes: Optional[int] = 60
    base_burden_points: Optional[Decimal] = Decimal("1.00")
    sort_order: Optional[int] = 0
