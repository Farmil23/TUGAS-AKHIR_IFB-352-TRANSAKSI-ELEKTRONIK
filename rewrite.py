import re

with open('app/services/ai_contract_agent.py', 'r', encoding='utf-8') as f:
    text = f.read()

new_draft = """    draft = (
        f'\\n        <div style="font-family: serif; color: #1e293b; background: #ffffff; padding: 40px; text-align: justify; line-height: 1.8; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; max-width: 800px; margin: 0 auto; overflow-wrap: break-word;">\\n'
        f'            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 20px;">\\n'
        f'                <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 10px; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px;">PERJANJIAN KERJASAMA PENGEMBANGAN SISTEM <br> RETRIEVAL-AUGMENTED GENERATION (RAG)</h1>\\n'
        f'                <p style="font-size: 14px; color: #475569; font-weight: bold;">Nomor: AURA/RAG/{datetime.now().year}/{project_id}</p>\\n'
        f'            </div>\\n'
        f'            \\n'
        f'            <p style="margin-bottom: 20px;">Pada hari ini, tanggal <strong>{today}</strong>, dibuat dan ditandatangani perjanjian secara kriptografik (selanjutnya disebut "Perjanjian") antara:</p>\\n'
        f'            \\n'
        f'            <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">\\n'
        f'                <tr>\\n'
        f'                    <td style="width: 30px; vertical-align: top;">1.</td>\\n'
        f'                    <td style="vertical-align: top; padding-bottom: 10px;"><strong>PT. AURA AI LABS</strong> (PIHAK PERTAMA / PENGEMBANG)</td>\\n'
        f'                </tr>\\n'
        f'                <tr>\\n'
        f'                    <td style="width: 30px; vertical-align: top;">2.</td>\\n'
        f'                    <td style="vertical-align: top;"><strong>PT. MAJU MUNDUR / KLIEN</strong> (PIHAK KEDUA / PENGGUNA JASA)</td>\\n'
        f'                </tr>\\n'
        f'            </table>\\n'
        f'            \\n'
        f'            <h2 style="font-size: 16px; color: #0f172a; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; text-transform: uppercase;">Pasal 1: Ruang Lingkup Kerja (SOP)</h2>\\n'
        f'            <p>PIHAK PERTAMA sepakat untuk merancang, mengimplementasikan, dan melakukan <em>deployment</em> Sistem AI RAG dengan paket: <strong>{package_name}</strong>. Sistem dirancang khusus untuk memenuhi ekstraksi data sebagaimana dijabarkan pada brief berikut:</p>\\n'
        f'            <div style="background: #f1f5f9; padding: 15px; border-left: 4px solid #3b82f6; font-style: italic; margin: 15px 0; color: #334155;">\\n'
        f'                "{context}"\\n'
        f'            </div>\\n'
        f'            \\n'
        f'            <h2 style="font-size: 16px; color: #0f172a; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; text-transform: uppercase;">Pasal 2: Keamanan Data & Zero Leak Policy</h2>\\n'
        f'            <p>Seluruh basis data, dokumen (PDF/Word), dan parameter SQL yang diproses ("Corpus") akan dikelola melalui infrastruktur terisolasi. Algoritma akan menggunakan model <em>Large Language Models</em> (Llama / Mistral) yang di-<em>host</em> secara prifat. PIHAK PERTAMA bertanggung jawab mutlak atas setiap kebocoran data (Data Leakage) ke <em>public cloud</em>.</p>\\n'
        f'            \\n'
        f'            <h2 style="font-size: 16px; color: #0f172a; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; text-transform: uppercase;">Pasal 3: Penahanan Dana (Escrow) Dan Pembayaran</h2>\\n'
        f'            <p>Pembayaran senilai <strong>Rp 15.000.000</strong> diikat menggunakan skema penahanan keamanan (Escrow Webhook). Pengembangan fisik sistem algoritma RAG tidak akan dimulai sebelum Dana Escrow terverifikasi. PIHAK KEDUA berhak menolak hasil penyelesaian sistem bila tidak sesuai brief yang disepakati (Revisi).</p>\\n'
        f'\\n'
        f'            <h2 style="font-size: 16px; color: #0f172a; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; text-transform: uppercase;">Pasal 4: Kepemilikan Hak Kekayaan Intelektual (HAKI)</h2>\\n'
        f'            <p>Kecuali komponen Open Source (LangChain, LangGraph, ChromaDB), seluruh repositori <em>Source Code</em>, skema basis data Vektor, API <em>Endpoints</em>, dan parameter yang dipersonalisasi sepenuhnya beralih kepemilikannya (100% IP Transfer) ke PIHAK KEDUA setelah sistem diterima (<em>Delivered & Accepted</em>).</p>\\n'
        f'\\n'
        f'            <div style="margin-top: 50px; padding-top: 20px; border-top: 2px dashed #cbd5e1; text-align:center;">\\n'
        f'                <em style="color:#2563eb; font-size:13px; font-weight: bold;">Dokumen ini dihasilkan oleh AI Legal Entity dan dilindungi secara hukum lewat Hash Kriptografik SHA-256.</em>\\n'
        f'            </div>\\n'
        f'        </div>\\n'
        f'    )"""

new_text = re.sub(r"    draft = \(\n        f'\\n.*?f'    '\n    \)", new_draft, text, flags=re.DOTALL)

with open('app/services/ai_contract_agent.py', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Replaced successfully!")
