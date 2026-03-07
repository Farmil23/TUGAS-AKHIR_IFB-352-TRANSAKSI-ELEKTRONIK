from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.models.project import Project, ProjectState
from app.models.contract import DigitalContract
from app.services.ai_contract_agent import generate_contract_for_project
from app.services.contract_service import generate_contract_hash
from app.api.dependencies import get_db

router = APIRouter()

class BriefSubmissionRequest(BaseModel):
    client_id: int
    project_name: str
    client_brief: str

def generate_and_save_contract_task(project_id: int, client_brief: str, db: Session):
    """
    Background Task: 
    1. AI generates draft
    2. Hash is calculated
    3. DigitalContract row is created
    4. Update Project Status to PENDING_CONTRACT
    """
    # LangGraph Graph execution
    terms_text = generate_contract_for_project(project_id, client_brief)
    
    # Calculate SHA-256 Hash
    contract_hash = generate_contract_hash(terms_text)
    
    # Save to DB
    new_contract = DigitalContract(
        project_id=project_id,
        terms_text=terms_text,
        contract_hash=contract_hash
    )
    db.add(new_contract)
    
    # Update project state
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        project.status = ProjectState.PENDING_CONTRACT
        
    db.commit()


@router.post("/submit-brief", status_code=status.HTTP_202_ACCEPTED)
async def submit_project_brief(
    payload: BriefSubmissionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Endpoint saat Klien men-submit requirement/brief dari Landing Page.
    Otomatis membuat Project baru dengan state DRAFT,
    lalu menjalankan LangGraph Agent di background untuk memproses kontrak.
    """
    # 1. Otomatis buat Proyek Baru di DB
    new_project = Project(
        client_id=payload.client_id,
        name=payload.project_name or f"AI RAG System Development",
        status=ProjectState.DRAFT
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Lempar ke Background Task LangGraph Agent menggunakan ID Project yang baru dibuat
    background_tasks.add_task(generate_and_save_contract_task, new_project.id, payload.client_brief, db)
    
    return {
        "status": "processing",
        "project_id": new_project.id,
        "message": "Project brief diterima. AI Agent LangGraph sedang menyusun draf kontrak Legal (Escrow Terms)."
    }

from typing import Optional

class ProjectStatusUpdate(BaseModel):
    new_status: str
    deployment_link: Optional[str] = None
    developer_notes: Optional[str] = None
    client_revision_notes: Optional[str] = None

@router.put("/{project_id}/status")
def update_project_status(project_id: int, payload: ProjectStatusUpdate, db: Session = Depends(get_db)):
    """
    Endpoint for Admin or App logic to transition project states 
    (e.g., ESCROW_FUNDED -> IN_PROGRESS -> FULLY_PAID)
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    try:
        new_enum_status = ProjectState[payload.new_status]
    except KeyError:
        raise HTTPException(status_code=400, detail="Status tidak valid")
        
    project.status = new_enum_status
    
    if payload.deployment_link:
        project.deployment_link = payload.deployment_link
    if payload.developer_notes:
        project.developer_notes = payload.developer_notes
    if payload.client_revision_notes:
        project.client_revision_notes = payload.client_revision_notes
        
    db.commit()
    db.refresh(project)
    
    return {"message": "Status proyek berhasil diperbarui", "status": project.status.value}

@router.get("/")
def get_projects(client_id: int = None, db: Session = Depends(get_db)):
    """
    Get all projects. 
    If client_id is provided, filters for that specific client (Client Dashboard).
    If no client_id, returns all projects (Admin Dashboard).
    """
    query = db.query(Project)
    if client_id is not None:
        query = query.filter(Project.client_id == client_id)
        
    projects = query.order_by(Project.created_at.desc()).all()
    
    # Format the output to include contract hash and deployment data if available
    result = []
    for p in projects:
        contract_hash = p.contract.contract_hash if p.contract else None
        result.append({
            "id": p.id,
            "name": p.name,
            "status": p.status.value,
            "hash": contract_hash,
            "deployment_link": p.deployment_link,
            "developer_notes": p.developer_notes,
            "client_revision_notes": p.client_revision_notes,
            "created_at": p.created_at
        })
        
    return result

@router.get("/{project_id}/contract")
def get_project_contract(project_id: int, db: Session = Depends(get_db)):
    """
    Get the detailed contract text and hash for a specific project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    contract = project.contract
    if not contract:
        raise HTTPException(status_code=404, detail="Kontrak belum di-generate oleh AI Agent")
        
    return {
        "status": "success",
        "contract": {
            "hash": contract.contract_hash,
            "terms_text": contract.terms_text,
            "is_accepted": contract.is_accepted,
            "accepted_at": contract.accepted_at
        }
    }
