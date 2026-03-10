from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.v1.endpoints import contracts, payments, projects, audit
import os

app = FastAPI(
    title="Agency Transaction API",
    description="Backend untuk E-Contract dan Escrow Management Platform",
    version="1.0.0"
)

# Allow CORS for local frontend and Vercel deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Project & Briefs"])
app.include_router(contracts.router, prefix="/api/v1/contracts", tags=["Digital Contracts"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payment Webhooks"])
app.include_router(audit.router, prefix="/api/v1/audit-logs", tags=["Audit Log"])

# Serve static frontend files (styles.css, app.js, etc.)
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

# Serve frontend index.html at root
@app.get("/", include_in_schema=False)
def serve_frontend():
    index_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "System Operational. Secure Electronic Transaction API."}

# Catch-all for SPA client-side routing
@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str):
    # JANGAN intersep API routes - kembalikan 404 JSON agar tidak override FastAPI router
    if full_path.startswith("api/") or full_path == "api":
        return {"error": "API endpoint not found", "path": full_path}

    index_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    static_file = os.path.join(os.path.dirname(__file__), "..", "frontend", full_path)
    
    # If static file exists (js/css), serve it
    if os.path.exists(static_file) and os.path.isfile(static_file):
        return FileResponse(static_file)
    
    # Otherwise fall back to index.html (SPA routing)
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"error": "Not Found"}
