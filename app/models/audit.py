from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.base import Base

class AuditLog(Base):
    """
    PERINGATAN: Di arsitektur ini, dilarang keras membuat fungsi UPDATE atau DELETE
    untuk row di tabel ini setelah di-insert.
    """
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    user_id = Column(Integer, nullable=False) 
    
    action = Column(String(255), nullable=False) 
    previous_state = Column(String(255), nullable=True)
    new_state = Column(String(255), nullable=True)
    
    ip_address = Column(String(45), nullable=True)
    details = Column(Text, nullable=True) 
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    project = relationship("Project", back_populates="audit_logs")
