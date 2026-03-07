from pydantic import BaseModel, Field

class ContractAcceptRequest(BaseModel):
    project_id: int = Field(..., gt=0)
    # Klien harus mengirim validasi Hash yang mereka "Lihat" di UI
    client_contract_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 dokumen")
