import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Table,
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Ward(Base):
    __tablename__ = "wards"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    timezone = Column(String(50), nullable=False, default="Asia/Seoul")
    status = Column(String(20), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    memberships = relationship("WardMembership", back_populates="ward")
    shift_templates = relationship("ShiftTemplate", back_populates="ward")
    policy_versions = relationship("PolicyVersion", back_populates="ward")
    schedule_periods = relationship("SchedulePeriod", back_populates="ward")


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    login_id = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="NURSE")  # NURSE, SCHEDULER, ADMIN
    status = Column(String(20), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("StaffProfile", back_populates="user", uselist=False)
    memberships = relationship("WardMembership", back_populates="user")


class WardMembership(Base):
    __tablename__ = "ward_memberships"

    id = Column(String(50), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)

    ward = relationship("Ward", back_populates="memberships")
    user = relationship("User", back_populates="memberships")


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"), unique=True, nullable=False)
    display_name = Column(String(50), nullable=False)
    staff_code = Column(String(50), nullable=False)  # 사번 대체 식별자
    active_status = Column(String(20), nullable=False, default="ACTIVE")
    joined_on = Column(Date, nullable=False)
    left_on = Column(Date, nullable=True)

    user = relationship("User", back_populates="profile")
    employment_periods = relationship("StaffEmploymentPeriod", back_populates="staff")
    skill_periods = relationship("StaffSkillPeriod", back_populates="staff")
    assignments = relationship("ShiftAssignment", back_populates="staff")
    time_off_requests = relationship("TimeOffRequest", back_populates="staff")


class StaffEmploymentPeriod(Base):
    __tablename__ = "staff_employment_periods"

    id = Column(String(50), primary_key=True)
    staff_id = Column(String(50), ForeignKey("staff_profiles.id"), nullable=False)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    employment_type = Column(String(30), nullable=False, default="SHIFT")  # FULL_TIME, SHIFT, PART_TIME, NIGHT_ONLY
    target_work_minutes_per_period = Column(Integer, nullable=False, default=9600)  # 160h
    can_work_night = Column(Boolean, nullable=False, default=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)

    staff = relationship("StaffProfile", back_populates="employment_periods")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String(50), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)  # CHARGE_CAPABLE, DELIVERY_ROOM, NEW_GRAD
    label = Column(String(100), nullable=False)


class StaffSkillPeriod(Base):
    __tablename__ = "staff_skill_periods"

    id = Column(String(50), primary_key=True)
    staff_id = Column(String(50), ForeignKey("staff_profiles.id"), nullable=False)
    skill_id = Column(String(50), ForeignKey("skills.id"), nullable=False)
    proficiency_level = Column(String(20), default="COMPETENT")
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)

    staff = relationship("StaffProfile", back_populates="skill_periods")
    skill = relationship("Skill")
