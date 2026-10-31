from typing import List, Optional
import datetime
from pydantic import BaseModel, ConfigDict


class StaffSkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    label: str
    proficiency_level: Optional[str] = "COMPETENT"


class StaffEmploymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    employment_type: str
    target_work_minutes: int
    can_work_night: bool


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    display_name: str
    staff_code: str
    role: str
    active_status: str
    employment_type: str
    target_work_minutes: int
    can_work_night: bool
    skill_tags: List[str]


class StaffCreate(BaseModel):
    display_name: str
    staff_code: str
    role: Optional[str] = "NURSE"
    employment_type: Optional[str] = "SHIFT"
    target_work_minutes: Optional[int] = 9600
    can_work_night: Optional[bool] = True
    skill_tags: Optional[List[str]] = []


class StaffUpdate(BaseModel):
    display_name: Optional[str] = None
    employment_type: Optional[str] = None
    target_work_minutes: Optional[int] = None
    can_work_night: Optional[bool] = None
    active_status: Optional[str] = None
    skill_tags: Optional[List[str]] = None
