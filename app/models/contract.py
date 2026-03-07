from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.base import Base

class DigitalContract(Base):
    __tablename__ = 'digital_contracts'
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), unique=True, nullable=False)
    
    terms_text = Column(Text, nullable=False) 
    contract_hash = Column(String(64), nullable=False) 
    
    # E-Signature Traces (Legal Validity)
    is_accepted = Column(Boolean, default=False, nullable=False)
    client_ip_address = Column(String(45), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    
    project = relationship("Project", back_populates="contract")
