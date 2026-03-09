import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///medical_directory.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    
    if DATABASE_URL.startswith("sqlite"):
        import sqlite3
        try:
            conn = sqlite3.connect("medical_directory.db")
            conn.execute("ALTER TABLE patientprofile ADD COLUMN phone VARCHAR")
            conn.commit()
            conn.close()
        except Exception:
            pass

def get_session():
    with Session(engine) as session:
        yield session
