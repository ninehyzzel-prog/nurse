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


class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id = Column(String(50), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="PUBLISHED")  # DRAFT, PUBLISHED, ARCHIVED
    created_by = Column(String(50), ForeignKey("users.id"), nullable=False)
    published_at = Column(DateTime, nullable=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)

    ward = relationship("Ward", back_populates="policy_versions")
    rules = relationship("PolicyRule", back_populates="policy_version")
    weight_rules = relationship("FairnessWeightRule", back_populates="policy_version")


class PolicyRule(Base):
    __tablename__ = "policy_rules"

    id = Column(String(50), primary_key=True)
    policy_version_id = Column(String(50), ForeignKey("policy_versions.id"), nullable=False)
    rule_type = Column(String(50), nullable=False)  # H-REST, H-WEEK, H-CONSEC, H-OFF-MIN
    parameter_json = Column(Text, nullable=False)   # {"min_rest_minutes": 660}
    hard_soft = Column(String(10), nullable=False, default="HARD")  # HARD, SOFT
    weight = Column(Numeric(5, 2), default=0.00)
    legal_floor = Column(Boolean, nullable=False, default=False)   # True면 완화 불가
    justification = Column(Text, nullable=True)

    policy_version = relationship("PolicyVersion", back_populates="rules")


class FairnessWeightRule(Base):
    __tablename__ = "fairness_weight_rules"

    id = Column(String(50), primary_key=True)
    policy_version_id = Column(String(50), ForeignKey("policy_versions.id"), nullable=False)
    metric_type = Column(String(50), nullable=False)  # weekend_off_deficit, ungranted_pref, burden_excess, importance
    weight_value = Column(Numeric(8, 2), nullable=False)
    cap_value = Column(Numeric(8, 2), nullable=True)
    stack_mode = Column(String(20), default="MAX")  # MAX, SUM

    policy_version = relationship("PolicyVersion", back_populates="weight_rules")
