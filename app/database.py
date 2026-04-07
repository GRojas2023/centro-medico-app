import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import inspect, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///medical_directory.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)


def ensure_medic_profile_columns():
    inspector = inspect(engine)
    if "medicprofile" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("medicprofile")}
    required_columns = {
        "first_name": "VARCHAR",
        "last_name": "VARCHAR",
        "phone": "VARCHAR",
        "locality": "VARCHAR",
        "province": "VARCHAR",
        "organization": "VARCHAR DEFAULT 'Particular'",
    }

    with engine.begin() as connection:
        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                connection.execute(
                    text(f"ALTER TABLE medicprofile ADD COLUMN {column_name} {column_type}")
                )

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    ensure_medic_profile_columns()
    
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
