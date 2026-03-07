import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship

from app.models.base import Base

class ProjectState(enum.Enum):
    DRAFT = "DRAFT"
    PENDING_CONTRACT = "PENDING_CONTRACT"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    ESCROW_FUNDED = "ESCROW_FUNDED"
    IN_PROGRESS = "IN_PROGRESS"
    MILESTONE_1_APPROVED = "MILESTONE_1_APPROVED"
    COMPLETED = "COMPLETED"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    FULLY_PAID = "FULLY_PAID"

class Project(Base):
    __tablename__ = 'projects'
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, index=True, nullable=False) # FK to User Table
    name = Column(String(255), nullable=False)
    status = Column(Enum(ProjectState), default=ProjectState.DRAFT, nullable=False)
    
    # Handover Details
    deployment_link = Column(String(500), nullable=True)
    developer_notes = Column(String(2000), nullable=True)
    client_revision_notes = Column(String(2000), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # OOP Relations
    contract = relationship("DigitalContract", back_populates="project", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="project", cascade="all, delete-orphan", order_by="AuditLog.created_at")
