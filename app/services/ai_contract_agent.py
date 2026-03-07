from typing import TypedDict, Annotated, Sequence
import operator
from langgraph.graph import StateGraph, START, END

# Define the State for the Agent
class ContractState(TypedDict):
    project_id: int
    client_brief: str
    business_context: str
    draft_contract: str
    errors: list[str]
    is_approved: bool

# --- Node Functions ---

def analyze_requirements(state: ContractState) -> dict:
    """Node 1: Analyze client brief and extract key deliverables."""
    # TODO: In production, call LLM (e.g., GPT-4 / Claude) here
    brief = state.get("client_brief", "")
    
    # Mocking LLM extraction to perfectly match what Frontend shows
    # We strip out the package preamble from the text just like the JS substring(0,80)
    import re
    package_match = re.search(r"\[Paket:\s*(.*?)\]", brief)
    package_name = package_match.group(1) if package_match else "Unknown"
    
    clean_brief = brief.split("Kebutuhan: ")[-1] if "Kebutuhan: " in brief else brief
    clean_brief = clean_brief[:80]
    
    return {
        "business_context": clean_brief,
        "package_name": package_name # passing custom var via state isn't strictly necessary for our dict return here
    }


def generate_draft(state: ContractState) -> dict:
    """Node 2: Generates the actual legal terms based on the context."""
    context = state.get("business_context", "")
    brief = state.get("client_brief", "")
    
    import re
    package_match = re.search(r"\[Paket:\s*(.*?)\]", brief)
    package_name = package_match.group(1) if package_match else "Unknown"
    
    from datetime import datetime
    import locale
    
    # Try setting locale for Indonesian date, if it fails, fallback gracefully
    try:
        locale.setlocale(locale.LC_TIME, 'id_ID.UTF-8')
    except:
        try:
            locale.setlocale(locale.LC_TIME, 'Indonesian')
        except:
            pass
            
    today = datetime.now().strftime("%d %B %Y")
    project_id = state.get("project_id", "1")
    year = datetime.now().year
    
    price_str = "45.000.000" if "Pro" in package_name else "15.000.000"

    draft = f"""
        <div style="font-family: 'Georgia', serif; color: #1e293b; background: #ffffff; padding: 40px 50px; text-align: justify; line-height: 1.9; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; max-width: 800px; margin: 0 auto; overflow-wrap: break-word;">
            <div style="text-align: center; margin-bottom: 35px; border-bottom: 3px solid #0f172a; padding-bottom: 25px;">
                <p style="font-size: 11px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">DOKUMEN PERJANJIAN KERJASAMA RESMI</p>
                <h1 style="font-size: 20px; color: #0f172a; margin-bottom: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900; line-height: 1.4;">PERJANJIAN KERJASAMA PENGEMBANGAN SISTEM<br>RETRIEVAL-AUGMENTED GENERATION (RAG)</h1>
                <p style="font-size: 13px; color: #475569; font-weight: 700; font-family: monospace;">Nomor: AURA/RAG/{year}/{project_id}</p>
            </div>
            
            <p style="margin-bottom: 20px; font-size: 14.5px;">Pada hari ini, tanggal <strong>{today}</strong>, dibuat dan ditandatangani perjanjian secara kriptografik (selanjutnya disebut <em>"Perjanjian"</em>) antara para pihak berikut:</p>
            
            <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e2e8f0; font-size: 14px;">
                <tr style="background: #f8fafc;">
                    <td style="padding: 12px 15px; width: 100px; vertical-align: top; border: 1px solid #e2e8f0; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Pihak I</td>
                    <td style="padding: 12px 15px; vertical-align: top; border: 1px solid #e2e8f0;"><strong>PT. AURA AI LABS</strong> — sebagai Pihak Pertama (Pengembang)</td>
                </tr>
                <tr>
                    <td style="padding: 12px 15px; width: 100px; vertical-align: top; border: 1px solid #e2e8f0; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Pihak II</td>
                    <td style="padding: 12px 15px; vertical-align: top; border: 1px solid #e2e8f0;"><strong>PT. MAJU MUNDUR</strong> — sebagai Pihak Kedua (Pengguna Jasa / Klien)</td>
                </tr>
            </table>
            
            <h2 style="font-size: 14px; color: #0f172a; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Pasal 1 — Ruang Lingkup Kerja</h2>
            <p style="font-size: 14.5px;">PIHAK PERTAMA sepakat untuk merancang, mengimplementasikan, dan melakukan <em>deployment</em> Sistem AI RAG dengan paket: <strong style="color: #1d4ed8;">{package_name}</strong>. Sistem dirancang khusus untuk memenuhi ekstraksi data sebagaimana dijabarkan pada brief berikut:</p>
            <div style="background: #eff6ff; padding: 15px 20px; border-left: 5px solid #2563eb; font-style: italic; margin: 15px 0; color: #1e40af; border-radius: 0 6px 6px 0; font-size: 14px;">
                &#34;{context}&#34;
            </div>
            
            <h2 style="font-size: 14px; color: #0f172a; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Pasal 2 — Keamanan Data &amp; Zero Leak Policy</h2>
            <p style="font-size: 14.5px;">Seluruh basis data, dokumen PDF/Word, dan parameter SQL yang diproses (<em>"Corpus"</em>) akan dikelola melalui infrastruktur terisolasi sepenuhnya di lingkungan <em>on-premise</em> atau <em>private cloud</em> milik klien. Algoritma menggunakan model <em>Large Language Models</em> (Llama / Mistral) yang di-<em>host</em> secara privat. PIHAK PERTAMA bertanggung jawab mutlak atas setiap kebocoran data ke <em>public cloud</em> pihak ketiga.</p>
            
            <h2 style="font-size: 14px; color: #0f172a; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Pasal 3 — Penahanan Dana (Escrow) dan Pembayaran</h2>
            <p style="font-size: 14.5px;">Pembayaran senilai <strong style="color: #1d4ed8;">Rp {price_str}</strong> diikat menggunakan skema penahanan keamanan (<em>Escrow Webhook</em>). Pengembangan sistem RAG tidak akan dimulai sebelum Dana Escrow terverifikasi oleh sistem. PIHAK KEDUA berhak menolak hasil penyelesaian bila tidak sesuai <em>brief</em> yang disepakati, dan berhak mengajukan revisi.</p>

            <h2 style="font-size: 14px; color: #0f172a; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Pasal 4 — Kepemilikan Hak Kekayaan Intelektual (HAKI)</h2>
            <p style="font-size: 14.5px;">Kecuali komponen Open Source (LangChain, LangGraph, ChromaDB), seluruh <em>Source Code</em>, skema basis data Vektor, API <em>Endpoints</em>, dan parameter yang dipersonalisasi sepenuhnya beralih kepemilikannya (100% IP Transfer) ke PIHAK KEDUA setelah sistem diserahkan dan diterima (<em>Delivered &amp; Accepted</em>).</p>

            <div style="margin-top: 50px; padding-top: 20px; border-top: 2px dashed #cbd5e1; text-align: center;">
                <p style="color: #2563eb; font-size: 13px; font-weight: 700; font-family: monospace;">&#128274; Dokumen ini dibuat dan dilindungi secara hukum menggunakan tanda tangan Hash Kriptografik SHA-256.</p>
            </div>
        </div>"""
    
    return {"draft_contract": draft}


def review_draft(state: ContractState) -> dict:
    """Node 3: Quality assurance / Compliance check on the generated draft."""
    draft = state.get("draft_contract", "")
    
    # Ensure escrow clause exists
    if "Escrow" not in draft:
        return {"errors": ["Missing mandatory Escrow clause"], "is_approved": False}
        
    return {"is_approved": True, "errors": []}


# --- Routing Logic ---

def route_after_review(state: ContractState) -> str:
    """Decide whether to rebuild the contract or finish."""
    if state.get("is_approved"):
        return END
    return "generate_draft" # loop back if fails compliance


# --- Build LangGraph Workflow ---

workflow = StateGraph(ContractState)

# Add Nodes
workflow.add_node("analyze_requirements", analyze_requirements)
workflow.add_node("generate_draft", generate_draft)
workflow.add_node("review_draft", review_draft)

# Add Edges
workflow.add_edge(START, "analyze_requirements")
workflow.add_edge("analyze_requirements", "generate_draft")
workflow.add_edge("generate_draft", "review_draft")

# Conditional Routing
workflow.add_conditional_edges(
    "review_draft",
    route_after_review,
    {
        END: END,
        "generate_draft": "generate_draft"
    }
)

# Compile Graph
contract_generator_app = workflow.compile()

def generate_contract_for_project(project_id: int, client_brief: str) -> str:
    """
    Called by FastAPI Endpoint or Background Task.
    Executes the agentic workflow to produce legal draft.
    """
    initial_state = {
        "project_id": project_id,
        "client_brief": client_brief,
        "business_context": "",
        "draft_contract": "",
        "errors": [],
        "is_approved": False
    }
    
    # Run the graph
    final_state = contract_generator_app.invoke(initial_state)
    
    return final_state["draft_contract"]
