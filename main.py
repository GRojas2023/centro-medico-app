# main.py
# Backend completo para un directorio médico y gestión de turnos usando FastAPI.
# Para ejecutar:
# 1. Instalar dependencias: pip install fastapi "uvicorn[standard]" sqlalchemy pydantic==2.* "python-jose[cryptography]" passlib bcrypt==3.2.0 python-multipart
# 2. Guardar este código como main.py
# 3. Ejecutar en la terminal: uvicorn main:app --reload
# 4. Abrir el navegador en http://127.0.0.1:8000/docs

import os
from typing import List, Optional
from datetime import datetime, time, timedelta
import enum

import uvicorn
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Table, Time, Enum as SAEnum
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field, ConfigDict
from passlib.context import CryptContext
from jose import JWTError, jwt

# --- Configuración de Seguridad ---
SECRET_KEY = "un-secreto-muy-seguro-y-dificil-de-adivinar" # En producción, usar una variable de entorno
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Configuración de la Base de Datos (SQLite en archivo) ---
DATABASE_URL = "sqlite:///./medical_directory.db"
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Enums ---
class DayOfWeek(enum.Enum):
    MONDAY = 0; TUESDAY = 1; WEDNESDAY = 2; THURSDAY = 3; FRIDAY = 4; SATURDAY = 5; SUNDAY = 6

class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"

# --- Modelos de la Base de Datos (SQLAlchemy ORM) ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(SAEnum(UserRole))
    # Relación uno a uno con Professional
    professional_profile = relationship("Professional", back_populates="user", uselist=False)

professional_insurance_link = Table('professional_insurance_link', Base.metadata,
    Column('professional_id', Integer, ForeignKey('professionals.id'), primary_key=True),
    Column('insurance_id', Integer, ForeignKey('insurances.id'), primary_key=True)
)

class Professional(Base):
    __tablename__ = "professionals"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    specialty = Column(String, index=True)
    gender = Column(String, index=True)
    location = Column(String)
    rating = Column(Float, default=0.0)
    photo_url = Column(String, nullable=True)
    # Vínculo con el usuario doctor
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    user = relationship("User", back_populates="professional_profile")
    
    appointments = relationship("Appointment", back_populates="professional")
    insurances = relationship("Insurance", secondary=professional_insurance_link, back_populates="professionals")
    availabilities = relationship("Availability", back_populates="professional")

class Insurance(Base):
    __tablename__ = "insurances"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    professionals = relationship("Professional", secondary=professional_insurance_link, back_populates="insurances")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    professional_id = Column(Integer, ForeignKey("professionals.id"))
    patient_id = Column(Integer, ForeignKey("users.id")) # Vinculado al usuario
    appointment_time = Column(DateTime)
    status = Column(String, default="scheduled")
    professional = relationship("Professional", back_populates="appointments")
    patient = relationship("User")

class Availability(Base):
    __tablename__ = "availabilities"
    id = Column(Integer, primary_key=True, index=True)
    professional_id = Column(Integer, ForeignKey("professionals.id"))
    day_of_week = Column(SAEnum(DayOfWeek))
    start_time = Column(Time)
    end_time = Column(Time)
    professional = relationship("Professional", back_populates="availabilities")

# --- Esquemas de Datos (Pydantic) ---
class UserBase(BaseModel):
    email: str
    role: UserRole
class UserCreate(UserBase):
    password: str
class UserSchema(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
class TokenData(BaseModel):
    email: Optional[str] = None

class InsuranceBase(BaseModel): name: str
class InsuranceCreate(InsuranceBase): pass
class InsuranceSchema(InsuranceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AvailabilityBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
class AvailabilityCreate(AvailabilityBase): pass
class AvailabilitySchema(AvailabilityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ProfessionalBase(BaseModel):
    full_name: str; specialty: str; gender: str; location: str
    rating: Optional[float] = 0.0
    photo_url: Optional[str] = None
class ProfessionalCreate(ProfessionalBase):
    user_id: int # El admin debe especificar a qué usuario doctor pertenece el perfil
class ProfessionalSchema(ProfessionalBase):
    id: int
    user_id: int
    insurances: List[InsuranceSchema] = []
    availabilities: List[AvailabilitySchema] = []
    model_config = ConfigDict(from_attributes=True)

class AppointmentBase(BaseModel):
    professional_id: int
    appointment_time: datetime = Field(..., example="2025-12-31T15:30:00")
class AppointmentCreate(AppointmentBase): pass
class AppointmentSchema(AppointmentBase):
    id: int
    status: str
    patient_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Lógica de Autenticación ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password):
    return pwd_context.hash(password)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Lógica de Negocio (CRUD y otros) ---
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user

def create_professional(db: Session, professional: ProfessionalCreate):
    # Verificar que el user_id corresponde a un doctor y no tiene ya un perfil
    user = db.query(User).filter(User.id == professional.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with id {professional.user_id} not found.")
    if user.role != UserRole.doctor:
        raise HTTPException(status_code=400, detail="User is not a doctor.")
    if user.professional_profile:
        raise HTTPException(status_code=400, detail="Doctor user already has a professional profile.")
        
    db_professional = Professional(**professional.dict())
    db.add(db_professional); db.commit(); db.refresh(db_professional)
    return db_professional

def get_professionals(db: Session, specialty: Optional[str], gender: Optional[str], insurance_name: Optional[str], skip: int = 0, limit: int = 20):
    query = db.query(Professional)
    if specialty: query = query.filter(Professional.specialty == specialty)
    if gender: query = query.filter(Professional.gender == gender)
    if insurance_name: query = query.join(Professional.insurances).filter(Insurance.name == insurance_name)
    return query.offset(skip).limit(limit).all()

def get_professional_by_id(db: Session, professional_id: int):
    return db.query(Professional).filter(Professional.id == professional_id).first()

def create_availability(db: Session, availability: AvailabilityCreate, professional_id: int):
    db_availability = Availability(**availability.dict(), professional_id=professional_id)
    db.add(db_availability); db.commit(); db.refresh(db_availability)
    return db_availability

def create_appointment(db: Session, appointment: AppointmentCreate, patient_id: int):
    professional = get_professional_by_id(db, appointment.professional_id)
    requested_day = DayOfWeek(appointment.appointment_time.weekday())
    requested_time = appointment.appointment_time.time()
    is_available = any(avail.day_of_week == requested_day and avail.start_time <= requested_time < avail.end_time for avail in professional.availabilities)
    if not is_available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El profesional no está disponible en el horario solicitado.")
    existing_appointment = db.query(Appointment).filter(Appointment.professional_id == appointment.professional_id, Appointment.appointment_time == appointment.appointment_time).first()
    if existing_appointment:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El turno en el horario solicitado ya está ocupado.")
    db_appointment = Appointment(**appointment.dict(), patient_id=patient_id)
    db.add(db_appointment); db.commit(); db.refresh(db_appointment)
    return db_appointment

def get_appointments_for_professional(db: Session, professional_id: int):
    return db.query(Appointment).filter(Appointment.professional_id == professional_id).all()

# --- Aplicación FastAPI ---
app = FastAPI(title="MediSearch API", description="API para un directorio de profesionales médicos y gestión de turnos.", version="1.3.0")


origins = [
    "http://localhost:3000",
    # El puerto 3000 es el que usa React por defecto
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    if os.path.exists("./medical_directory.db"):
        os.remove("./medical_directory.db")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Crear usuario administrador
    create_user(db, UserCreate(email="admin@example.com", password="adminpassword", role=UserRole.admin))
    # Crear un usuario doctor
    doctor_user = create_user(db, UserCreate(email="doctor@example.com", password="doctorpassword", role=UserRole.doctor))
    # Crear un perfil profesional y vincularlo al usuario doctor
    create_professional(db, ProfessionalCreate(
        full_name="Dr. Alan Grant",
        specialty="Paleontology",
        gender="Male",
        location="Montana, USA",
        user_id=doctor_user.id
    ))
    db.close()

# --- Endpoints ---
@app.post("/token", response_model=Token, tags=["Authentication"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=UserSchema, tags=["Users"])
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db=db, user=user)

@app.get("/users/me/", response_model=UserSchema, tags=["Users"])
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.post("/professionals/", response_model=ProfessionalSchema, tags=["Professionals"])
def create_professional_profile(professional: ProfessionalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can create professional profiles.")
    return create_professional(db=db, professional=professional)

@app.get("/professionals/", response_model=List[ProfessionalSchema], tags=["Professionals"])
def read_professionals(specialty: Optional[str] = Query(None), gender: Optional[str] = Query(None), insurance: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return get_professionals(db, specialty=specialty, gender=gender, insurance_name=insurance)

@app.post("/professionals/{professional_id}/availability/", response_model=AvailabilitySchema, status_code=201, tags=["Professionals"])
def add_professional_availability(professional_id: int, availability: AvailabilityCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    professional = get_professional_by_id(db, professional_id)
    if not professional:
        raise HTTPException(status_code=404, detail="Professional not found")
    if current_user.role == UserRole.admin:
        pass # El admin puede modificar cualquier disponibilidad
    elif current_user.role == UserRole.doctor:
        if professional.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to add availability for this professional")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    return create_availability(db, availability, professional_id)

@app.get("/doctors/me/", response_model=ProfessionalSchema, tags=["Doctors"])
def get_my_professional_profile(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="User is not a doctor")
    if not current_user.professional_profile:
        raise HTTPException(status_code=404, detail="This doctor user does not have a professional profile yet.")
    return current_user.professional_profile

@app.get("/doctors/me/appointments/", response_model=List[AppointmentSchema], tags=["Doctors"])
def get_my_appointments(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="User is not a doctor")
    if not current_user.professional_profile:
        raise HTTPException(status_code=404, detail="This doctor user does not have a professional profile yet.")
    professional_id = current_user.professional_profile.id
    return get_appointments_for_professional(db=db, professional_id=professional_id)

@app.post("/appointments/", response_model=AppointmentSchema, status_code=201, tags=["Appointments"])
def schedule_appointment(appointment: AppointmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patients can schedule appointments")
    if not get_professional_by_id(db, appointment.professional_id):
        raise HTTPException(status_code=404, detail="Profesional no encontrado")
    return create_appointment(db=db, appointment=appointment, patient_id=current_user.id)

@app.get("/appointments/{professional_id}", response_model=List[AppointmentSchema], tags=["Appointments"])
def get_professional_appointments(professional_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.admin, UserRole.doctor]:
        raise HTTPException(status_code=403, detail="Not authorized")
    professional = get_professional_by_id(db, professional_id)
    if not professional:
        raise HTTPException(status_code=404, detail="Professional not found")
    if current_user.role == UserRole.doctor and professional.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view these appointments")
    return get_appointments_for_professional(db=db, professional_id=professional_id)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
