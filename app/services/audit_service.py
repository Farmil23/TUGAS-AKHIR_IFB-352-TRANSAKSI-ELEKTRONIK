from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def write_audit_log(
    db: Session, 
    project_id: int, 
    user_id: int, 
    action: str, 
    ip_address: str, 
    prev_state: Optional[str] = None, 
    new_state: Optional[str] = None,
    details: Optional[str] = None
):
    """
    Menulis jejak transaksi. Ingat: Append-Only.
    """
    log_entry = AuditLog(
        project_id=project_id,
        user_id=user_id,
        action=action,
        previous_state=prev_state,
        new_state=new_state,
        ip_address=ip_address,
        details=details,
        created_at=datetime.utcnow()
    )
    db.add(log_entry)
    # Note: caller will be the one responsible for calling db.commit() to ensure atomicity.
