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


class SchedulePeriod(Base):
    __tablename__ = "schedule_periods"

    id = Column(String(50), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="PLANNING")  # PLANNING, GENERATED, CONFIRMED, ARCHIVED
    policy_version_id = Column(String(50), ForeignKey("policy_versions.id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)

    ward = relationship("Ward", back_populates="schedule_periods")
    policy_version = relationship("PolicyVersion")
    versions = relationship("ScheduleVersion", back_populates="period")
    runs = relationship("ScheduleRun", back_populates="period")


class ScheduleVersion(Base):
    __tablename__ = "schedule_versions"

    id = Column(String(50), primary_key=True)
    schedule_period_id = Column(String(50), ForeignKey("schedule_periods.id"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="DRAFT")  # DRAFT, PUBLISHED, ARCHIVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    created_by = Column(String(50), ForeignKey("users.id"), nullable=False)
    parent_version_id = Column(String(50), ForeignKey("schedule_versions.id"), nullable=True)
    change_reason = Column(Text, nullable=True)

    period = relationship("SchedulePeriod", back_populates="versions")
    assignments = relationship("ShiftAssignment", back_populates="version", cascade="all, delete-orphan")


class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id = Column(String(50), primary_key=True)
    schedule_version_id = Column(String(50), ForeignKey("schedule_versions.id"), nullable=False)
    staff_id = Column(String(50), ForeignKey("staff_profiles.id"), nullable=False)
    shift_template_version_id = Column(String(50), ForeignKey("shift_template_versions.id"), nullable=False)
    local_start_date = Column(Date, nullable=False)  # YYYY-MM-DD
    start_at_utc = Column(DateTime, nullable=False)
    end_at_utc = Column(DateTime, nullable=False)
    paid_work_minutes = Column(Integer, nullable=False, default=0)
    break_minutes = Column(Integer, nullable=False, default=0)
    source = Column(String(20), nullable=False, default="AUTO")  # AUTO, MANUAL, PINNED
    is_pinned = Column(Boolean, nullable=False, default=False)
    note = Column(String(255), nullable=True)

    version = relationship("ScheduleVersion", back_populates="assignments")
    staff = relationship("StaffProfile", back_populates="assignments")
    template_version = relationship("ShiftTemplateVersion", back_populates="assignments")


class ScheduleRun(Base):
    __tablename__ = "schedule_runs"

    id = Column(String(50), primary_key=True)
    schedule_period_id = Column(String(50), ForeignKey("schedule_periods.id"), nullable=False)
    policy_version_id = Column(String(50), ForeignKey("policy_versions.id"), nullable=False)
    solver_version = Column(String(50), nullable=False, default="OR-Tools CP-SAT 9.10")
    status = Column(String(20), nullable=False)  # FEASIBLE, OPTIMAL, INFEASIBLE, TIMEOUT, FAILED
    seed = Column(Integer, nullable=False, default=42)
    input_snapshot_hash = Column(String(64), nullable=False)
    diagnostics_json = Column(Text, nullable=True)
    created_by = Column(String(50), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    period = relationship("SchedulePeriod", back_populates="runs")
    candidates = relationship("RunCandidate", back_populates="run", cascade="all, delete-orphan")


class RunCandidate(Base):
    __tablename__ = "run_candidates"

    id = Column(String(50), primary_key=True)
    schedule_run_id = Column(String(50), ForeignKey("schedule_runs.id"), nullable=False)
    rank = Column(Integer, nullable=False, default=1)
    total_score = Column(Numeric(10, 2), nullable=False, default=0.00)
    fairness_score = Column(Numeric(5, 2), nullable=False, default=0.00)
    fairness_metrics_json = Column(Text, nullable=False)
    coverage_metrics_json = Column(Text, nullable=False)

    run = relationship("ScheduleRun", back_populates="candidates")
    assignments = relationship("RunCandidateAssignment", back_populates="candidate", cascade="all, delete-orphan")


class RunCandidateAssignment(Base):
    __tablename__ = "run_candidate_assignments"

    id = Column(String(50), primary_key=True)
    run_candidate_id = Column(String(50), ForeignKey("run_candidates.id"), nullable=False)
    staff_id = Column(String(50), ForeignKey("staff_profiles.id"), nullable=False)
    shift_template_version_id = Column(String(50), ForeignKey("shift_template_versions.id"), nullable=False)
    local_start_date = Column(Date, nullable=False)
    start_at_utc = Column(DateTime, nullable=False)
    end_at_utc = Column(DateTime, nullable=False)

    candidate = relationship("RunCandidate", back_populates="assignments")
