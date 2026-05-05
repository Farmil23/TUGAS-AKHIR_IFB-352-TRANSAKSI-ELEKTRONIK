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

def create_stripe_session(order_id: str, gross_amount: int, project_name: str, success_url: str, cancel_url: str, price_id: str = None):
    """
    Membuat Stripe Checkout Session.
    Jika price_id diberikan, gunakan produk dari dashboard Stripe.
    Jika tidak, gunakan harga manual (inline).
    """
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        if price_id:
            # Jika yang diberikan adalah Product ID (prod_...), cari Price ID-nya secara otomatis
            if price_id.startswith('prod_'):
                prices = stripe.Price.list(product=price_id, active=True, limit=1)
                if prices.data:
                    price_id = prices.data[0].id
                else:
                    print(f"Error: Tidak ada harga aktif untuk produk {price_id}")
                    return None

            line_item = {
                'price': price_id,
                'quantity': 1,
            }
        else:
            line_item = {
                'price_data': {
                    'currency': 'idr',
                    'product_data': {
                        'name': project_name,
                        'description': f"Order ID: {order_id}",
                    },
                    'unit_amount': int(gross_amount),
                },
                'quantity': 1,
            }

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[line_item],
            mode='payment',
            client_reference_id=order_id,
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return {
            "id": session.id,
            "url": session.url
        }
    except Exception as e:
        print(f"Stripe Session Creation Error: {e}")
        return None
