from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agency Escrow API"
    DATABASE_URL: str = "sqlite:///./agency_db.db"
    SECRET_KEY: str = "super_secret_jwt_key_here_please_change"
    ALGORITHM: str = "HS256"

    # Roboflow / cash detection
    ROBOFLOW_API_KEY: str = ""
    ROBOFLOW_API_URL: str = "https://serverless.roboflow.com"
    ROBOFLOW_WORKSPACE_NAME: str = ""
    ROBOFLOW_WORKFLOW_ID: str = ""
    ROBOFLOW_CONFIDENCE_THRESHOLD: float = 0.4
    
    PAYMENT_SERVER_KEY: str = "SB-Mid-server-YOUR_SERVER_KEY"
    PAYMENT_CLIENT_KEY: str = "SB-Mid-client-YOUR_CLIENT_KEY"
    
    STRIPE_KEY: str = "" # pk_test_... (Stripe Public Key)
    STRIPE_SECRET_KEY: str = "" # sk_test_... (Stripe Secret Key)

    class Config:
        env_file = ".env"

settings = Settings()
