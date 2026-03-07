from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.api.dependencies import get_db

router = APIRouter()

@router.get("/")
def get_all_audit_logs(db: Session = Depends(get_db)):
    """
    Admin Endpoint: Fetch all immutable audit logs for the dashboard.
    """
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    
    return [
        {
            "id": log.id,
            "project_id": log.project_id,
            "user_id": log.user_id,
            "action": log.action,
            "previous_state": log.previous_state,
            "new_state": log.new_state,
            "ip_address": log.ip_address,
            "created_at": log.created_at
        }
        for log in logs
    ]
