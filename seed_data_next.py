import asyncio
from app.core.database import SessionLocal
from app.models.project import Project, ProjectState
from app.models.audit import AuditLog
# --- TAMBAHKAN IMPORT USER ---
# Sesuaikan path 'app.models.user' dan nama class 'User' dengan proyekmu
from app.models.user import User ,UserRole

async def seed_data():
    db = SessionLocal()
    try:
        # 1. Cek atau Buat User Dummy dengan ID 1 terlebih dahulu
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(
                id=1,
                email="client@example.com",
                full_name="Client Dummy",          # Menggantikan 'username'
                hashed_password="dummyhashedpwd",  # Wajib diisi karena nullable=False
                role=UserRole.CLIENT               # Opsional, tapi bagus untuk memperjelas role
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("✅ User Dummy dengan ID 1 berhasil dibuat!")

        # 2. Baru buat project menggunakan ID dari user tersebut
        project = Project(
            client_id=user.id, # Menggunakan ID user yang valid
            name="Pembuatan Sistem Legal Tech (RAG)",
            status=ProjectState.DRAFT
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Create initial audit log
        log = AuditLog(
            project_id=project.id,
            user_id=user.id, # Menggunakan ID user yang valid
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
        
    except Exception as e:
        db.rollback()
        print(f"❌ Terjadi error saat seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_data())