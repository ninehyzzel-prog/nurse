import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


class StaffMonthlyFairnessMetric(Base):
    __tablename__ = "staff_monthly_fairness_metrics"

    id = Column(String(50), primary_key=True)
    staff_id = Column(String(50), ForeignKey("staff_profiles.id"), nullable=False)
    schedule_period_id = Column(String(50), ForeignKey("schedule_periods.id"), nullable=False)
    policy_version_id = Column(String(50), ForeignKey("policy_versions.id"), nullable=False)
    work_burden_points = Column(Numeric(8, 2), nullable=False, default=0.00)
    base_shift_points = Column(Numeric(8, 2), nullable=False, default=0.00)
    weekend_bonus_points = Column(Numeric(8, 2), nullable=False, default=0.00)
    holiday_bonus_points = Column(Numeric(8, 2), nullable=False, default=0.00)
    consecutive_bonus_points = Column(Numeric(8, 2), nullable=False, default=0.00)
    preference_mismatch_points = Column(Numeric(8, 2), nullable=False, default=0.00)
    actual_work_minutes = Column(Integer, nullable=False, default=0)
    night_work_minutes = Column(Integer, nullable=False, default=0)
    weekend_work_minutes = Column(Integer, nullable=False, default=0)
    full_weekend_off_count = Column(Integer, nullable=False, default=0)
    consecutive_work_days_max = Column(Integer, nullable=False, default=0)
    request_grant_rate = Column(Numeric(5, 4), nullable=True)
    normalized_deviation = Column(Numeric(6, 4), nullable=False, default=0.0000)

    staff = relationship("StaffProfile")
    period = relationship("SchedulePeriod")


class MonthlyCarryoverBalance(Base):
    __tablename__ = "monthly_carryover_balances"

    id = Column(String(50), primary_key=True)
    staff_id = Column(String(50), ForeignKey("staff_profiles.id"), nullable=False)
    period_start_date = Column(Date, nullable=False)
    weekend_off_deficit_count = Column(Integer, nullable=False, default=0)
    ungranted_preference_count = Column(Integer, nullable=False, default=0)
    burden_excess_ratio = Column(Numeric(6, 4), nullable=False, default=0.0000)
    expires_at = Column(Date, nullable=False)  # 3개월 rolling 만료일

    staff = relationship("StaffProfile")


class ExplanationFact(Base):
    __tablename__ = "explanation_facts"

    id = Column(String(50), primary_key=True)
    schedule_run_id = Column(String(50), ForeignKey("schedule_runs.id"), nullable=False)
    subject_type = Column(String(30), nullable=False)  # ASSIGNMENT, REQUEST_CONFLICT, INFEASIBLE_SLOT
    subject_id = Column(String(50), nullable=False)
    reason_code = Column(String(50), nullable=False)   # MANDATORY_COVERAGE, REST_RULE_PROTECTION 등
    rule_version = Column(Integer, nullable=False, default=1)
    fact_json = Column(Text, nullable=False)
    explanation_text = Column(Text, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(50), primary_key=True)
    actor_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)        # CREATE, UPDATE, DELETE, PUBLISH, OVERRIDE
    entity_type = Column(String(50), nullable=False)   # ASSIGNMENT, POLICY, TIME_OFF_REQUEST
    entity_id = Column(String(50), nullable=False)
    before_json = Column(Text, nullable=True)
    after_json = Column(Text, nullable=True)
    at_utc = Column(DateTime, default=datetime.datetime.utcnow)
    request_ip = Column(String(50), nullable=True)
