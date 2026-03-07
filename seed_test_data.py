import asyncio
from app.core.database import SessionLocal
from app.models.project import Project, ProjectState
from app.models.audit import AuditLog

async def seed_data():
    db = SessionLocal()
    try:
        # Create a dummy project in DRAFT state
        project = Project(
            client_id=1,
            name="Pembuatan Sistem Legal Tech (RAG)",
            status=ProjectState.DRAFT
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Create initial audit log
        log = AuditLog(
            project_id=project.id,
            user_id=1,
            action="PROJECT_CREATED",
            new_state=ProjectState.DRAFT.value,
            ip_address="127.0.0.1",
            details="Sistem diinisialisasi melalui seeder"
        )
        db.add(log)
        db.commit()
        
        print(f"✅ Data Dummy berhasil dibuat!")
        print(f"👉 Project ID: {project.id}")
        print(f"👉 Client ID: {project.client_id}")
        print(f"Status saat ini: {project.status.value}")
        print("\nSekarang Anda bisa melakukan test endpoint POST /api/v1/projects/submit-brief")
        print(f"dengan payload: {{'project_id': {project.id}, 'client_brief': 'Saya butuh RAG...'}}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
