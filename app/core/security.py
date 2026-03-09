from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, UserRole
from firebase_admin import auth

# Esto le dice a Swagger dónde obtener el token (mantenemos esto para que el botón 'Authorize' siga apareciendo en Swagger)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_firebase_user(token: str = Depends(oauth2_scheme)):
    """Verifica el token de Firebase y devuelve el payload del usuario"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying Firebase token: {e}")
        raise credentials_exception

def get_current_user(firebase_user: dict = Depends(get_firebase_user), session: Session = Depends(get_session)) -> User:
    """Obtiene el usuario de la DB a partir del token de Firebase. Lo crea si no existe (ej. login con Google)."""
    email = firebase_user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    user = session.exec(select(User).where(User.email == email)).first()
    
    if user is None:
        # Auto-crear usuario si no existe (muy útil para Google Sign-In)
        import secrets
        user = User(
            email=email, 
            password_hash="FIREBASE_MANAGED", 
            role=UserRole.PATIENT
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
    return user
