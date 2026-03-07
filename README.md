# Backend Transaksi Elektronik & E-Contract

Proyek ini adalah backend berbasis **FastAPI** dan **MySQL** murni menggunakan Python untuk platform Software House / Agency dengan fitur Transaksi Elektronik, Digital Signature Hash (SHA-256), dan Immutable Audit Logs.

## Prasyarat
- Python 3.9+ 
- Database MySQL Server

## Cara Menjalankan Aplikasi di Lokal (Windows)

### 1. Buat Virtual Environment 
Disarankan selalu menggunakan Virtual Environment Python untuk mengisolasi instalasi package:
```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Database MySQL
1. Pastikan server MySQL berjalan di komputer Anda.
2. Buat database baru bernama `agency_db`:
   ```sql
   CREATE DATABASE agency_db;
   ```
3. Buka file `.env` dan pastikan konfigurasi `DATABASE_URL` sesuai dengan _username_ dan _password_ MySQL komputer Anda:
   ```env
   DATABASE_URL=mysql+pymysql://USERNAME_ANDA:PASSWORD_ANDA@localhost:3306/agency_db
   ```
   _(Secara default diisi: `root` dan `password`, silakan disesuaikan!)_

### 4. Jalankan Migrasi Database (Alembic)
Untuk membangun struktur tabel `Project`, `DigitalContract`, dan `AuditLog` ke dalam MySQL Anda, jalankan perintah Alembic ini di folder root proyek Anda (*pastikan berada di satu folder dengan `alembic.ini`*):
```bash
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### 5. Jalankan Server FastAPI
Jalankan server aplikasi Anda menggunakan Uvicorn:
```bash
uvicorn app.main:app --reload
```

Server kini aktif! Buka browser dan kunjungi:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)** 

Anda akan langsung disambut oleh halaman antarmuka dari **Swagger UI** di mana Anda bisa mencoba semua fitur endpoint yang telah kita buat (Contract Acceptance, Webhooks, Brief Submit) secara visual.
