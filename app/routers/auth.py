from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel
from pydantic import EmailStr
from app.database import get_session
from app.models import User, UserRole, PatientProfile
from app.core.security import get_firebase_user

router = APIRouter(prefix="/auth", tags=["auth"])

# El endpoint /login ha sido eliminado porque el inicio de sesión se hace directamente con Firebase en el Frontend.
# Sin embargo, creamos este endpoint dummy para que Swagger UI no tire error en el botón 'Authorize'.
from fastapi.security import OAuth2PasswordRequestForm
@router.post("/login", include_in_schema=False)
def swagger_login_dummy(form_data: OAuth2PasswordRequestForm = Depends()):
    # SOLO PARA SWAGGER UI: Devolver un token dummy temporal. En la app real, el frontend obtiene el token de Firebase.
    # Swagger no podrá acceder a endpoints protegidos realmente a menos que se pegue un token válido de Firebase.
    return {"access_token": "swagger_dummy_token", "token_type": "bearer"}

class PatientRegisterRequest(SQLModel):
    email: EmailStr

@router.post("/register")
def register_patient(
    patient_in: PatientRegisterRequest,
    firebase_user: dict = Depends(get_firebase_user),
    session: Session = Depends(get_session)
):
    # Verificar que el email solicitado para el perfil coincide con el token de Firebase
    if firebase_user.get("email") != patient_in.email:
        raise HTTPException(status_code=403, detail="El email no cincide con el token de autenticación")

    # Check if email exists
    user = session.exec(select(User).where(User.email == patient_in.email)).first()
    if user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
        
    # Create the User, strictly as a Patient
    new_user = User(
        email=patient_in.email,
        password_hash="FIREBASE_MANAGED",
        role=UserRole.PATIENT
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return {"message": "Usuario registrado exitosamente", "user_id": new_user.id}
