import hashlib
import hmac
from app.core.config import settings

def verify_payment_signature(
    order_id: str, 
    status_code: str, 
    gross_amount: float, 
    server_key: str, 
    received_signature: str
) -> bool:
    """
    Validasi signature webhook Midtrans.
    Rumus: SHA512(order_id + status_code + gross_amount + server_key)
    """
    # Pastikan format amount sesuai dengan expected dari gateway (biasanya 2 desimal atau integer string utuh)
    # Ini diasumsikan menggunakan standar format "10000.00"
    amount_str = f"{gross_amount:.2f}"
    
    payload = f"{order_id}{status_code}{amount_str}{server_key}"
    
    # Kalkulasi hash
    calculated_signature = hashlib.sha512(payload.encode('utf-8')).hexdigest()
    
    # Gunakan hmac.compare_digest untuk mencegah Timing Attacks saat membandingkan string kriptografi
    return hmac.compare_digest(calculated_signature, received_signature)
