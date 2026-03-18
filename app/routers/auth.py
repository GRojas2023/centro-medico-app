from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from pydantic import EmailStr
from sqlmodel import SQLModel

from app.database import get_session
from app.models import User, UserRole
from app.core.security import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class PatientRegisterRequest(SQLModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """Inicio de sesión con email y contraseña. Devuelve un JWT propio."""
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register")
def register_patient(
    patient_in: PatientRegisterRequest,
    session: Session = Depends(get_session),
):
    """Registro de paciente nuevo con email y contraseña."""
    existing = session.exec(select(User).where(User.email == patient_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    new_user = User(
        email=patient_in.email,
        password_hash=get_password_hash(patient_in.password),
        role=UserRole.PATIENT,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    # Login automático tras registro
    token = create_access_token(data={"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer", "user_id": new_user.id}
