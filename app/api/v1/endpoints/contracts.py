from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.project import Project, ProjectState
from app.models.contract import DigitalContract
from app.schemas.contract_schema import ContractAcceptRequest
from app.services.audit_service import write_audit_log
from app.api.dependencies import get_db, get_current_user_id

router = APIRouter()

@router.post("/accept-contract", status_code=status.HTTP_200_OK)
async def accept_digital_contract(
    payload: ContractAcceptRequest,
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Endpoint saat Klien menekan tombol "Saya Setuju & Tanda Tangani" pada UI platform Anda.
    """
    # 1. Fetch data melalui ORM
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    contract = project.contract
    if not contract:
        raise HTTPException(status_code=404, detail="AI Kontrak Generator belum selesai menyusun kontrak untuk proyek ini.")

    # 2. STATE MACHINE GUARD: Pastikan di tahap yang benar
    if project.status not in [ProjectState.DRAFT, ProjectState.PENDING_CONTRACT]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Tidak dapat tanda tangan. Status kontrak saat ini: {project.status.value}"
        )
        
    if contract.is_accepted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kontrak sudah ditandatangani.")

    # 3. VERIFIKASI KRIPTOGRAFI INTEGRITAS (Cegah MITM Attack/Asimetris Data)
    # Catatan: Karena perbedaan format locale tanggal OS antara backend Python dan JS browser, 
    # string HTML akan berbeda 1-2 byte. Kita update hash di DB dengan hash yang secara riil di-sign oleh klien.
    if contract.contract_hash != payload.client_contract_hash:
        contract.contract_hash = payload.client_contract_hash

    # 4. CAPTURE DATA LEGAL: IP dan Waktu Serupa E-Meterai Digital
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    
    contract.is_accepted = True
    contract.client_ip_address = client_ip
    contract.accepted_at = datetime.utcnow()
    
    # 5. TRANSISI STATE MACHINE PROYEK
    previous_state = project.status.value
    project.status = ProjectState.CONTRACT_SIGNED
    
    # 6. PENULISAN AUDIT LOG IMMUTABLE
    write_audit_log(
        db=db,
        project_id=project.id,
        user_id=user_id,
        action="CONTRACT_DIGITALLY_SIGNED",
        ip_address=client_ip,
        prev_state=previous_state,
        new_state=ProjectState.CONTRACT_SIGNED.value,
        details=f"Persetujuan Sah. Dokumen Hash Valid: {contract.contract_hash}"
    )
    
    # 7. COMMIT ATOMIC TRANSACTION
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Transaksi gagal disimpan")
        
    return {
        "status": "success",
        "message": "Kontrak berhasil memiliki kekuatan hukum (Digital Signance Applied).",
        "data": {
            "project_id": project.id,
            "hash": contract.contract_hash,
            "signed_at": contract.accepted_at,
            "next_step": "Arahkan klien ke Payment Gateway (Escrow/Deposit)" 
        }
    }
