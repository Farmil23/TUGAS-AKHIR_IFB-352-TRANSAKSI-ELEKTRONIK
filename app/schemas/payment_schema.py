from pydantic import BaseModel, Field
from typing import Optional

class PaymentWebhookPayload(BaseModel):
    transaction_id: str = Field(..., description="ID Transaksi dari Gateway (Midtrans/Xendit)")
    order_id: str = Field(..., description="ID Order internal kita (format: PROJ-{id}-MIL-{id})")
    gross_amount: float = Field(..., description="Nominal yang dibayarkan")
    payment_type: str = Field(..., description="Tipe pembayaran e.g., bank_transfer, ewallet")
    transaction_status: str = Field(..., description="Kondisi e.g., settlement, pending, deny, expire, cancel")
    signature_key: str = Field(..., description="SHA512 hash dari gateway untuk validasi keamanan")
    fraud_status: Optional[str] = Field(None, description="Status fraud jika ada (Midtrans spesifik)")
