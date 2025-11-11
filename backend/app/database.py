from sqlmodel import SQLModel, create_engine,Session
import os

# Ensure the uploads folder exists
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Database file inside uploads folder
DATABASE_URL = f"sqlite:///{os.path.join(UPLOAD_FOLDER, 'database.db')}"

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)