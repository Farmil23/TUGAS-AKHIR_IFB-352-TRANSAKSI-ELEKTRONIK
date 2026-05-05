from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core import security
import os
from dotenv import load_dotenv

load_dotenv()

def seed_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == "farhan").first()
        if admin:
            db.delete(admin)
            db.commit()
            print("Old admin deleted")

        new_admin = User(
            email="farhan",
            full_name="Farhan Admin",
            hashed_password=security.get_password_hash("12345678"),
            role=UserRole.ADMIN
        )
        db.add(new_admin)
        db.commit()
        print("Admin 'farhan' created successfully")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
