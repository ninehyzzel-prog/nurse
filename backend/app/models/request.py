import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(String(50), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    code = Column(String(30), nullable=False)  # PREFERENCE_OFF, ANNUAL_LEAVE, PROTECTED_LEAVE, UNAVAILABLE
    name = Column(String(50), nullable=False)  # 일반 희망 OFF, 법정 연차, 보호 휴가
    category = Column(String(30), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)


class TimeOffRequest(Base):
    __tablename__ = "time_off_requests"

    id = Column(String(50), primary_key=True)
    staff_id = Column(String(50), ForeignKey("staff_profiles.id"), nullable=False)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    leave_type_id = Column(String(50), ForeignKey("leave_types.id"), nullable=False)
    status = Column(String(20), nullable=False, default="SUBMITTED")  # DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, NOT_GRANTED, WITHDRAWN
    is_important = Column(Boolean, nullable=False, default=False)
    reason_note = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_by = Column(String(50), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    version = Column(Integer, nullable=False, default=1)  # Optimistic concurrency

    staff = relationship("StaffProfile", back_populates="time_off_requests")
    leave_type = relationship("LeaveType")
    dates = relationship("TimeOffRequestDate", back_populates="request", cascade="all, delete-orphan")
    priority_evaluation = relationship("OffRequestPriorityEvaluation", back_populates="request", uselist=False)


class TimeOffRequestDate(Base):
    __tablename__ = "time_off_request_dates"

    id = Column(String(50), primary_key=True)
    request_id = Column(String(50), ForeignKey("time_off_requests.id"), nullable=False)
    local_date = Column(Date, nullable=False)  # YYYY-MM-DD
    optional_rank = Column(Integer, default=1)
    preferred_shift_template_id = Column(String(50), ForeignKey("shift_templates.id"), nullable=True)

    request = relationship("TimeOffRequest", back_populates="dates")


class OffRequestPriorityEvaluation(Base):
    __tablename__ = "off_request_priority_evaluations"

    id = Column(String(50), primary_key=True)
    request_id = Column(String(50), ForeignKey("time_off_requests.id"), unique=True, nullable=False)
    policy_version_id = Column(String(50), ForeignKey("policy_versions.id"), nullable=False)
    weekend_off_deficit_points = Column(Numeric(5, 2), nullable=False, default=0.00)
    ungranted_points = Column(Numeric(5, 2), nullable=False, default=0.00)
    burden_excess_points = Column(Numeric(5, 2), nullable=False, default=0.00)
    importance_points = Column(Numeric(5, 2), nullable=False, default=0.00)
    total_priority_points = Column(Numeric(5, 2), nullable=False, default=0.00)
    evaluation_details_json = Column(Text, nullable=True)

    request = relationship("TimeOffRequest", back_populates="priority_evaluation")
