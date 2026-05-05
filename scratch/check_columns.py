from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
columns = inspector.get_columns('users')
for column in columns:
    print(f"Column: {column['name']}, Type: {column['type']}")
