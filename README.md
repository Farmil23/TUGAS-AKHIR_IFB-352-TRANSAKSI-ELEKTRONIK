# 🌌 Aura AI Labs - Enterprise RAG & E-Transaction Platform

![Status](https://img.shields.io/badge/Status-Operational-success)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![Security](https://img.shields.io/badge/Security-SHA--256-blueviolet)

**Aura AI Labs** adalah platform mutakhir yang merekayasa sistem **Retrieval-Augmented Generation (RAG)** khusus untuk kebutuhan korporat. Aplikasi ini mengintegrasikan seluruh siklus transaksi elektronik secara legal, mulai dari penandatanganan kontrak digital hingga pengelolaan dana *Escrow*.

---

## 💎 Fitur Unggulan

### 1. Smart E-Contract & Legal Tech
- **AI-Powered Contract Synthesis**: Dokumen hukum dihasilkan secara dinamis berdasarkan brief proyek.
- **Cryptographic Signature**: Penandatanganan kontrak dilindungi oleh hash SHA-256 yang menjamin integritas dokumen (Immutable).
- **Project Completion Seal**: Kontrak akan otomatis mendapatkan stempel "COMPLETED" setelah serah terima aset disetujui.

### 2. Transaction Management (IPO Model)
- **Input**: Interface briefing yang intuitif untuk mendefinisikan parameter sistem AI.
- **Process**: Sistem pembayaran terintegrasi (Stripe) dengan fitur penahanan dana (Escrow).
- **Output**: Dashboard deployment, log audit yang transparan, dan bukti administrasi sah.

### 3. Professional Documentation Engine
- **Automated Invoice Generator**: Penerbitan invoice penagihan resmi secara instan.
- **Detailed Receipt System**: Kwitansi pembayaran dengan sistem "Terbilang" otomatis (Bahasa Indonesia) dan stempel verifikasi keuangan.

---

## 🛠️ Arsitektur Teknologi
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python) - Performa tinggi & Asynchronous.
- **Database**: [SQLAlchemy](https://www.sqlalchemy.org/) dengan SQLite/PostgreSQL - Relasional & Terstruktur.
- **Frontend**: Vanilla JS & CSS3 - Desain **Glassmorphism** premium tanpa library berat.
- **Security**: Kriptografi tingkat tinggi untuk proteksi kontrak dan sesi pengguna.

---

## 🚀 Panduan Instalasi

1. **Clone & Setup Environment**:
   ```bash
   git clone <repository-url>
   cd project-2
   python -m venv venv
   source venv/bin/activate  # venv\Scripts\activate untuk Windows
   ```

2. **Install Dependensi**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Inisialisasi Database & Seed Admin**:
   ```bash
   python seed_admin.py
   ```

4. **Jalankan Aplikasi**:
   ```bash
   uvicorn app.main:app --reload
   ```

---

## 📈 Alur Penggunaan (End-to-End)

| Tahapan | Aksi Pengguna | Hasil Output |
| :--- | :--- | :--- |
| **Pemesanan** | Pilih paket (Basic/Pro) & Isi Brief | Draft Proyek tersimpan di DB |
| **Legalitas** | Tanda tangan digital di modal Kontrak | Hash SHA-256 terbentuk |
| **Penagihan** | Klik tombol "Invoice" di Dashboard | Dokumen Invoice (PDF/Print) |
| **Pembayaran** | Bayar via Stripe atau Upload Bukti | Status: ESCROW_FUNDED |
| **Pengerjaan** | Admin memproses & mengirim link aplikasi | Status: IN_PROGRESS / COMPLETED |
| **Penyelesaian** | Client klik "Accept Delivery" | Kontrak dicap "COMPLETED" & Kwitansi terbit |

---

## 🔒 Kebijakan Keamanan Data (Zero Leak)
Seluruh dokumen dan parameter SQL yang diproses dikelola melalui infrastruktur terisolasi. Aura AI Labs menjamin bahwa tidak ada data sensitif perusahaan yang dikirim ke cloud publik pihak ketiga tanpa enkripsi tingkat tinggi.

---
&copy; 2026 **PT. Aura AI Labs**. All rights reserved.
*"Bridging Corporate Knowledge with Intelligence."*
