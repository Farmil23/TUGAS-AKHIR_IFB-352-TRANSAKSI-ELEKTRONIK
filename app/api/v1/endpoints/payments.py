from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.models.project import Project, ProjectState
from app.schemas.payment_schema import PaymentWebhookPayload
from app.services.payment_service import verify_payment_signature, create_stripe_session
from app.services.audit_service import write_audit_log
from app.api.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.core.config import settings
from app.services.cash_detection_service import cash_detector

router = APIRouter()

@router.get("/verify-session", status_code=status.HTTP_200_OK)
async def verify_payment_session(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint untuk memverifikasi pembayaran sesaat setelah redirect dari Stripe.
    Untuk kemudahan demo, kita akan langsung mengubah status proyek menjadi ESCROW_FUNDED.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyek tidak ditemukan.")
    
    # Check ownership
    if project.client_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bukan pemilik proyek ini")

    # Jika sudah funded, lewatkan
    if project.status == ProjectState.ESCROW_FUNDED:
        return {"status": "already_funded", "message": "Proyek sudah dalam status Escrow Funded."}

    # Update Status
    previous_state = project.status.value
    project.status = ProjectState.ESCROW_FUNDED
    
    # Audit Log
    write_audit_log(
        db=db,
        project_id=project.id,
        user_id=0,
        action="STRIPE_PAYMENT_CONFIRMED_REDIRECT",
        ip_address="127.0.0.1",
        prev_state=previous_state,
        new_state=ProjectState.ESCROW_FUNDED.value,
        details="Pembayaran dikonfirmasi via redirect sukses dari Stripe."
    )
    
    db.commit()
    return {"status": "success", "message": "Status proyek berhasil diperbarui ke ESCROW_FUNDED."}

# Schema untuk request checkout
class CheckoutRequest(BaseModel):
    project_id: int
    client_name: str = "Aura AI Client"

@router.post("/checkout", status_code=status.HTTP_200_OK)
async def create_payment_checkout(
    payload: CheckoutRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint untuk membuat Stripe Checkout Session.
    Frontend akan diarahkan ke URL Stripe untuk menyelesaikan pembayaran.
    """
    # Ambil proyek dari DB
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyek tidak ditemukan.")
    
    # Check ownership
    if project.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya pemilik yang bisa membayar")

    # Deteksi Base URL untuk redirect back
    origin = request.headers.get("origin") or "http://localhost:5500"
    success_url = f"{origin}/?payment=success&project_id={project.id}"
    cancel_url = f"{origin}/?payment=cancel&project_id={project.id}"

    # Tentukan harga (Stripe IDR tidak pakai sen, jadi 1:1)
    name_lower = (project.name or "").lower()
    price_id = None
    
    if "enterprise" in name_lower or "pro" in name_lower:
        gross_amount = 45_000_000
        # price_id = "price_PRO_ID_ANDA" # Silakan ganti dengan Price ID dari Dashboard Stripe
    elif "custom" in name_lower or "nlp" in name_lower:
        gross_amount = 60_000_000
        # price_id = "price_CUSTOM_ID_ANDA"
    else:
        gross_amount = 10_000_000
        # Gunakan Price ID yang berkaitan dengan Product prod_UIZckXJFE2yICZ
        

    order_id = f"PROJ-{project.id}-MIL-1"

    # Buat sesi Stripe
    session = create_stripe_session(
        order_id=order_id,
        gross_amount=gross_amount,
        project_name=project.name or "RAG System Development",
        success_url=success_url,
        cancel_url=cancel_url,
        price_id=price_id
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal membuat sesi pembayaran Stripe."
        )

    return {
        "status": "success",
        "sessionId": session["id"],
        "url": session["url"]
    }


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def payment_gateway_webhook(
    payload: PaymentWebhookPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Endpoint Webhook untuk menerima callback dari Payment Gateway (Midtrans/Xendit).
    Ini tidak memerlukan autentikasi JWT pengguna, melainkan validasi Signature Key.
    """
    # 1. VERIFIKASI KEAMANAN (Signature Hash)
    is_valid = verify_payment_signature(
        order_id=payload.order_id,
        status_code=payload.transaction_status,
        gross_amount=payload.gross_amount,
        server_key=settings.PAYMENT_SERVER_KEY,
        received_signature=payload.signature_key
    )
    
    if not is_valid:
        # Kembalikan 403 Forbidden agar gateway tau request ditolak karena invalid signature
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Webhook Signature")

    # 2. EKSTRAKSI DATA ORDER
    # Asumsikan order_id formatnya PROJ-{project_id}-MIL-{milestone_id}
    try:
        parts = payload.order_id.split("-")
        project_id = int(parts[1])
    except (IndexError, ValueError):
        # Format order ID tidak sesuai
        return {"status": "ignored", "message": "Format Order ID bukan dari sistem ini"}

    # 3. MENCARI PROYEK DI DB
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyek tidak ditemukan")

    # Ambil IP Gateway (Bisa di-whitelist jika perlu keamanan tambahan proxy/WAF)
    gateway_ip = request.headers.get("X-Forwarded-For", request.client.host)
    previous_state = project.status.value

    # 4. STATE MACHINE TRANSISI BERDASARKAN STATUS PEMBAYARAN
    new_state_value = None
    action_log = ""
    
    if payload.transaction_status == "settlement" or payload.transaction_status == "capture":
        # Escrow berhasil didanai
        # STATE GUARD: Jangan reset jika sudah FULLY_PAID atau COMPLETED
        if project.status not in [ProjectState.FULLY_PAID, ProjectState.COMPLETED]:
            project.status = ProjectState.ESCROW_FUNDED
            new_state_value = ProjectState.ESCROW_FUNDED.value
            action_log = "PAYMENT_SETTLED_ESCROW_FUNDED"
            
    elif payload.transaction_status in ["deny", "cancel", "expire"]:
        # Kasus pembayaran gagal / batal
        action_log = f"PAYMENT_FAILED_OR_CANCELLED: {payload.transaction_status.upper()}"
        new_state_value = previous_state # State tidak berubah, tapi tetap di-log

    else:
        # Status lain seperti 'pending'
        return {"status": "success", "message": f"Webhook diterima dengan status {payload.transaction_status}"}

    # 5. TULIS KE IMMUTABLE AUDIT LOG
    write_audit_log(
        db=db,
        project_id=project.id,
        user_id=0, # 0 untuk System / Webhook Trigger
        action=action_log,
        ip_address=gateway_ip,
        prev_state=previous_state,
        new_state=new_state_value,
        details=f"Gateway TxID: {payload.transaction_id}, Amount: {payload.gross_amount}, Type: {payload.payment_type}"
    )

    # 6. ATOMIC COMMIT
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Gagal memperbarui status order di database")

    return {"status": "success", "message": "Status pembayaran proyek berhasil diperbarui"}

@router.post("/upload-physical", status_code=status.HTTP_200_OK)
async def upload_physical_payment(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint untuk mengunggah bukti pembayaran fisik/manual (foto uang fisik).
    Akan mendeteksi nominal menggunakan OpenCV.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="File harus berupa gambar (image/png, image/jpeg, dll)."
        )

    try:
        # Read file bytes from upload
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read image file: {str(e)}"
        )

    # Lakukan deteksi uang dengan Roboflow YOLO, fallback ke template OpenCV bila perlu
    detection_result = cash_detector.detect_from_bytes(image_bytes)

    if detection_result.get("status") in {"failed", "error"}:
        # Anda dapat mengembalikan error secara langsung atau hanya peringatan
        return {
            "status": "warning",
            "message": detection_result.get("message") or detection_result.get("fallback_reason") or "Deteksi tunai tidak berhasil.",
            "requires_admin_validation": True,
            "detected_nominal": None,
            "source": detection_result.get("source"),
            "fallback_reason": detection_result.get("fallback_reason"),
            "roboflow_error": detection_result.get("roboflow_error"),
            "predictions": detection_result.get("predictions", []),
        }

    # Jika berhasil mendeteksi, kembalikan ke frontend
    nominal = detection_result.get("detected_nominal") or detection_result.get("nominal")
    confidence = detection_result.get("confidence")

    # Simpan image bytes ke file system untuk admin preview
    import os
    upload_dir = os.path.join(os.getcwd(), 'frontend', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"proj_{project_id}_{int(datetime.now().timestamp())}.jpg"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, 'wb') as f:
        f.write(image_bytes)

    # Simpan state ke database agar Admin tahu ada pembayaran tunai yang menunggu diverifikasi
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    if project.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Akses ditolak")

    if project:
        project.developer_notes = f"AWAITING_PHYSICAL_PAYMENT|Nominal:{nominal}|URL:uploads/{filename}"
        db.commit()
    return {
        "status": "success",
        "message": f"Uang pecahan {nominal} terdeteksi secara otomatis.",
        "detected_nominal": nominal,
        "confidence": confidence,
        "source": detection_result.get("source"),
        "predictions": detection_result.get("predictions", []),
        "fallback_reason": detection_result.get("fallback_reason"),
        "roboflow_error": detection_result.get("roboflow_error"),
        "requires_admin_validation": True,
        "instructions": "Admin akan segera memvalidasi pembayaran manual ini."
    }
