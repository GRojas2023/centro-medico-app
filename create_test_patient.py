import sys
import os
sys.path.append(os.getcwd())

from sqlmodel import Session, select
from app.database import engine
from app.models import User, UserRole
from app.core.security import get_password_hash

def create_patient():
    with Session(engine) as session:
        email = "paciente@test.com"
        password = "123456"
        
        # Check if user exists
        existing_user = session.exec(select(User).where(User.email == email)).first()
        
        if existing_user:
            print(f"User {email} already exists.")
            # Update password just in case
            existing_user.password_hash = get_password_hash(password)
            session.add(existing_user)
            session.commit()
            print(f"Password updated for {email}.")
        else:
            new_user = User(
                email=email,
                password_hash=get_password_hash(password),
                role=UserRole.PATIENT
            )
            session.add(new_user)
            session.commit()
            print(f"User {email} created successfully.")

if __name__ == "__main__":
    create_patient()
