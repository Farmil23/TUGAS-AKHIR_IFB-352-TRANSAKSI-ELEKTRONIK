import hashlib

def generate_contract_hash(terms_text: str) -> str:
    """
    Menerima teks / HTML Term of Service yang di-generate AI,
    lalu me-return representasi hash SHA-256 absolut.
    """
    encoded_bytes = terms_text.encode('utf-8')
    return hashlib.sha256(encoded_bytes).hexdigest()
