from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Time,
    Date,
    Numeric,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


class BreakPolicy(Base):
    __tablename__ = "break_policies"

    id = Column(String(50), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    default_break_minutes = Column(Integer, nullable=False, default=60)
    verification_status = Column(String(20), nullable=False, default="UNVERIFIED")  # UNVERIFIED, VERIFIED
    definition_json = Column(Text, nullable=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)


class ShiftTemplate(Base):
    __tablename__ = "shift_templates"

    id = Column(String(50), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    code = Column(String(20), nullable=False)  # DAY, NIGHT, EVENING, OFF, LEAVE
    label = Column(String(50), nullable=False)
    color_token = Column(String(50), nullable=False, default="shift-day")
    sort_order = Column(Integer, nullable=False, default=0)
    is_assignable = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)

    ward = relationship("Ward", back_populates="shift_templates")
    versions = relationship("ShiftTemplateVersion", back_populates="shift_template")


class ShiftTemplateVersion(Base):
    __tablename__ = "shift_template_versions"

    id = Column(String(50), primary_key=True)
    shift_template_id = Column(String(50), ForeignKey("shift_templates.id"), nullable=False)
    starts_at_local = Column(String(10), nullable=False)  # '08:00'
    ends_at_local = Column(String(10), nullable=False)    # '18:00'
    end_day_offset = Column(Integer, nullable=False, default=0)  # 0: same day, 1: next day
    break_policy_id = Column(String(50), ForeignKey("break_policies.id"), nullable=True)
    base_burden_points = Column(Numeric(5, 2), nullable=False, default=1.00)
    version = Column(Integer, nullable=False, default=1)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)

    shift_template = relationship("ShiftTemplate", back_populates="versions")
    break_policy = relationship("BreakPolicy")
    assignments = relationship("ShiftAssignment", back_populates="template_version")


class CoverageRequirement(Base):
    __tablename__ = "coverage_requirements"

    id = Column(String(50), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    shift_template_id = Column(String(50), ForeignKey("shift_templates.id"), nullable=False)
    scope = Column(String(20), nullable=False, default="ALL")  # WEEKDAY, WEEKEND, HOLIDAY, ALL
    minimum_staff = Column(Integer, nullable=False, default=1)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)

    shift_template = relationship("ShiftTemplate")
