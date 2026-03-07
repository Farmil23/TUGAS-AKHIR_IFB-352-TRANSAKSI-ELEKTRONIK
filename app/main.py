from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import contracts, payments, projects, audit

app = FastAPI(
    title="Agency Transaction API",
    description="Backend untuk E-Contract dan Escrow Management Platform",
    version="1.0.0"
)

# Allow CORS for local frontend testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Project & Briefs"])
app.include_router(contracts.router, prefix="/api/v1/contracts", tags=["Digital Contracts"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payment Webhooks"])
app.include_router(audit.router, prefix="/api/v1/audit-logs", tags=["Audit Log"])

@app.get("/")
def read_root():
    return {"message": "System Operational. Secure Electronic Transaction API."}
