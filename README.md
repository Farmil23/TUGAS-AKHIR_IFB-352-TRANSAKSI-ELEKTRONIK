# 🤖 Aura AI Labs — Electronic Transaction Platform

> Platform pemesanan jasa pengembangan sistem **Retrieval-Augmented Generation (RAG)** berbasis AI, dilengkapi dengan e-contract digital, sistem escrow, dan immutable audit log.

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 🛍️ **Katalog Layanan** | Tampilan e-commerce lengkap dengan detail produk, harga, dan demo |
| 📝 **AI Contract Generator** | Kontrak hukum dibuat otomatis oleh AI Agent (LangGraph) dari brief klien |
| 🔐 **Digital Signature** | Penandatanganan kontrak menggunakan hash SHA-256 (anti-tamper) |
| 💰 **Escrow System** | Dana klien ditahan di escrow sampai pengerjaan selesai & diterima |
| 🔄 **Revision Flow** | Klien bisa mengajukan revisi sebelum menyetujui hasil pekerjaan |
| 📋 **Immutable Audit Log** | Setiap aksi terekam permanen untuk kebutuhan hukum & dispute |
| 🛡️ **Admin Dashboard** | Panel kontrol developer untuk mengelola seluruh project pipeline |

---

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python), SQLAlchemy ORM, Alembic (migrations)
- **Database:** MySQL
- **AI Agent:** LangGraph (workflow agent untuk pembuatan kontrak)
- **Frontend:** Vanilla HTML/CSS/JS (Single Page Application)
- **Security:** SHA-256 hash-based integrity verification

---

## 📋 Prasyarat

Pastikan berikut ini sudah terinstall di komputer Anda:

- ✅ **Python 3.9+**
- ✅ **MySQL Server** (bisa menggunakan XAMPP, WAMP, atau MySQL Community Server)
- ✅ **Git**

---

## 🚀 Cara Menjalankan (Setup Lokal)

### 1. Clone Repositori

```bash
git clone https://github.com/<username>/<repo-name>.git
cd <repo-name>
```

### 2. Buat & Aktifkan Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Semua Dependency

```bash
pip install -r requirements.txt
```

### 4. Setup Environment Variables

Buat file `.env` di folder root proyek (salin dari contoh di bawah):

```env
# .env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/agency_db
SECRET_KEY=ganti_dengan_string_rahasia_yang_panjang
```

> ⚠️ Ganti `root` dan `password` sesuai konfigurasi MySQL Anda.

### 5. Buat Database MySQL

Masuk ke MySQL dan jalankan perintah berikut:

```sql
CREATE DATABASE agency_db;
```

### 6. Jalankan Migrasi Database (Alembic)

Perintah ini akan membuat semua tabel yang diperlukan secara otomatis:

```bash
alembic upgrade head
```

> Jika ini pertama kali dan belum ada file migrasi:
> ```bash
> alembic revision --autogenerate -m "Initial schema"
> alembic upgrade head
> ```

### 7. Jalankan Server

```bash
uvicorn app.main:app --reload
```

Server akan aktif di: **[http://localhost:8000](http://localhost:8000)**

---

## 🖥️ Mengakses Aplikasi

| URL | Keterangan |
|---|---|
| [http://localhost:8000](http://localhost:8000) | **Frontend** — Halaman utama / Landing Page |
| [http://localhost:8000/docs](http://localhost:8000/docs) | **Swagger UI** — Dokumentasi & Testing API |
| [http://localhost:8000/redoc](http://localhost:8000/redoc) | **ReDoc** — Dokumentasi API alternatif |

---

## 👤 Akun Demo

Untuk login tanpa registrasi (mode simulasi):

| Role | Cara Login |
|---|---|
| **Client** | Klik tombol `Client Login` di navbar |
| **Admin** | Klik tombol `Admin Gateway` di navbar |

> Di mode simulasi, cukup tekan tombol "Masuk" — tidak diperlukan username/password asli.

---

## 📁 Struktur Proyek

```
📦 Project Root
 ├── 📁 app/
 │   ├── 📁 api/v1/endpoints/    # Route handlers (projects, contracts, payments, audit)
 │   ├── 📁 core/                # Database, config, security
 │   ├── 📁 models/              # SQLAlchemy ORM models
 │   ├── 📁 schemas/             # Pydantic schemas
 │   ├── 📁 services/            # Business logic (AI agent, contract, payment)
 │   └── main.py                 # Entry point FastAPI app
 ├── 📁 alembic/                 # Database migration scripts
 ├── 📁 frontend/
 │   ├── index.html              # Single Page Application
 │   ├── app.js                  # Frontend logic & API calls
 │   └── styles.css              # UI styles
 ├── .env                        # Environment variables (JANGAN di-commit!)
 ├── .gitignore
 ├── alembic.ini
 ├── requirements.txt
 └── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/api/v1/projects/submit-brief` | Submit brief klien & generate kontrak AI |
| `GET` | `/api/v1/projects/` | List semua proyek |
| `GET` | `/api/v1/projects/{id}/contract` | Ambil kontrak untuk proyek tertentu |
| `PUT` | `/api/v1/projects/{id}/status` | Update status proyek (Admin) |
| `POST` | `/api/v1/contracts/accept-contract` | Tanda tangan digital oleh klien |
| `POST` | `/api/v1/payments/webhook` | Simulasi webhook konfirmasi pembayaran escrow |
| `GET` | `/api/v1/audit-logs` | Ambil semua immutable audit log |

---

## ⚙️ Alur Transaksi

```
Klien Submit Brief
      │
      ▼
AI LangGraph Agent → Generate Kontrak HTML
      │
      ▼
Klien Review & Tanda Tangan Digital (SHA-256 Hash)
      │
      ▼
Bayar ke Escrow → Webhook Konfirmasi
      │
      ▼
Admin Mulai Build AI (IN_PROGRESS)
      │
      ▼
Admin Deliver → Klien Accept / Revisi
      │
      ▼
Dana Escrow Dicairkan ke Developer ✅
```

---

## 🤝 Kontribusi

Pull requests sangat disambut! Untuk perubahan besar, buka *issue* terlebih dahulu untuk mendiskusikan apa yang ingin diubah.

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademik mata kuliah **Transaksi Elektronik** — ITENAS.
