from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.project import Project, ProjectState
from app.schemas.payment_schema import PaymentWebhookPayload
from app.services.payment_service import verify_payment_signature
from app.services.audit_service import write_audit_log
from app.api.dependencies import get_db
from app.core.config import settings

router = APIRouter()

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
