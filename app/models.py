from typing import Optional, List
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from pydantic import EmailStr

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    MEDIC = "medic"
    PATIENT = "patient"
    PHARMACY = "pharmacy"
    NURSE = "nurse"

class ReservationStatus(str, Enum):
    PENDING = "Pendiente"
    CONFIRMED = "Confirmado"
    CANCELLED = "Cancelado"
    COMPLETED = "Realizado"

class PostCategory(str, Enum):
    SCIENTIFIC = "Científico"
    SOCIAL = "Social"
    BIRTHDAY = "Cumpleaños"
    NOTICE = "Aviso"

# 1. Tablas Geográficas
class Location(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    latitude: float
    longitude: float
    
    users: List["User"] = Relationship(back_populates="location")

# 2. Usuarios y Roles
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: EmailStr = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.PATIENT)
    location_id: Optional[int] = Field(default=None, foreign_key="location.id")
    
    location: Optional[Location] = Relationship(back_populates="users")
    medic_profile: Optional["MedicProfile"] = Relationship(back_populates="user")
    medic_profile: Optional["MedicProfile"] = Relationship(back_populates="user")
    pharmacy_profile: Optional["Pharmacy"] = Relationship(back_populates="user")
    patient_profile: Optional["PatientProfile"] = Relationship(back_populates="user")
    
    posts: List["Post"] = Relationship(back_populates="author")
    comments: List["Comment"] = Relationship(back_populates="user")
    
    # Relaciones de citas
    reservations_as_patient: List["Reservation"] = Relationship(back_populates="patient", sa_relationship_kwargs={"foreign_keys": "Reservation.patient_id"})
    reservations_as_medic: List["Reservation"] = Relationship(back_populates="medic", sa_relationship_kwargs={"foreign_keys": "Reservation.medic_id"})

class MedicProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    specialty: str = Field(index=True)
    license_number: str
    bio: Optional[str] = None
    verification_status: bool = Field(default=False)
    
    # Advanced Schedule Config
    address: Optional[str] = None
    start_time: str = Field(default="09:00")
    end_time: str = Field(default="17:00")
    slot_duration: int = Field(default=30) # in minutes
    schedule_days: str = Field(default="Mon,Tue,Wed,Thu,Fri") # CSV
    blocked_dates: Optional[str] = None # CSV YYYY-MM-DD
    profile_image_url: Optional[str] = None
    
    user: User = Relationship(back_populates="medic_profile")
    shifts: List["WorkShift"] = Relationship(back_populates="medic_profile")

class WorkShift(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    medic_profile_id: int = Field(foreign_key="medicprofile.id")
    day_of_week: Optional[str] = None # Optional specific day, or None for "all configured days"
    start_time: str
    end_time: str
    
    medic_profile: MedicProfile = Relationship(back_populates="shifts")

# ... (Previous code)

class AIRecommendationRequest(SQLModel):
    prompt: str
    user_location_id: Optional[int] = None

class WorkShiftCreate(SQLModel):
    start_time: str
    end_time: str
    day_of_week: Optional[str] = None

class MedicProfileUpdate(SQLModel):
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_duration: Optional[int] = None
    schedule_days: Optional[str] = None
    blocked_dates: Optional[str] = None
    profile_image_url: Optional[str] = None
    shifts: Optional[List[WorkShiftCreate]] = None

class PharmacyUpdate(SQLModel):
    address: Optional[str] = None
    phone: Optional[str] = None
    is_on_duty: Optional[bool] = None


# 3. Gestión de Citas (Core)
class Reservation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="user.id")
    medic_id: int = Field(foreign_key="user.id")
    datetime: datetime
    status: ReservationStatus = Field(default=ReservationStatus.PENDING)
    symptoms: Optional[str] = None
    
    patient: User = Relationship(back_populates="reservations_as_patient", sa_relationship_kwargs={"primaryjoin": "Reservation.patient_id==User.id"})
    medic: User = Relationship(back_populates="reservations_as_medic", sa_relationship_kwargs={"primaryjoin": "Reservation.medic_id==User.id"})

# 4. Red Social de Salud
class Post(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author_id: int = Field(foreign_key="user.id")
    content: str
    image_url: Optional[str] = None
    category: PostCategory = Field(default=PostCategory.SOCIAL)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    author: User = Relationship(back_populates="posts")
    comments: List["Comment"] = Relationship(back_populates="post")

class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id")
    user_id: int = Field(foreign_key="user.id")
    content: str
    
    post: Post = Relationship(back_populates="comments")
    user: User = Relationship(back_populates="comments")

# 5. Farmacias y Ofertas
class Pharmacy(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    address: str
    is_on_duty: bool = Field(default=False)
    phone: Optional[str] = None
    
    user: User = Relationship(back_populates="pharmacy_profile")
    user: User = Relationship(back_populates="pharmacy_profile")
    offers: List["ProductOffer"] = Relationship(back_populates="pharmacy")

class PatientProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    first_name: str
    last_name: str
    dni: str = Field(index=True)
    birth_date: str # YYYY-MM-DD
    insurance: Optional[str] = None
    phone: Optional[str] = None
    
    user: User = Relationship(back_populates="patient_profile")

class ProductOffer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pharmacy_id: int = Field(foreign_key="pharmacy.id")
    product_name: str
    price: float
    discount: float = Field(default=0.0)
    expiration_date: Optional[datetime] = None
    
    pharmacy: Pharmacy = Relationship(back_populates="offers")

# Schemas for API creation (DTOs)
class UserCreate(SQLModel):
    email: EmailStr
    password: str
    role: UserRole
    location_id: Optional[int] = None

class ReservationCreate(SQLModel):
    medic_id: int
    datetime: datetime
class PatientData(SQLModel):
    first_name: str
    last_name: str
    dni: str
    birth_date: str
    insurance: Optional[str] = None
    phone: Optional[str] = None

class ReservationCreate(SQLModel):
    medic_id: int
    datetime: datetime
    symptoms: str
    patient_data: Optional[PatientData] = None

class PostCreate(SQLModel):
    content: str
    category: PostCategory
    image_url: Optional[str] = None

class AIRecommendationRequest(SQLModel):
    prompt: str
    user_location_id: Optional[int] = None

# Read Models for API Responses (explicitly include relationships)
class MedicProfileRead(SQLModel):
    id: int
    user_id: int
    specialty: str
    license_number: str
    bio: Optional[str] = None
    verification_status: bool
    address: Optional[str] = None
    start_time: str
    end_time: str
    slot_duration: int
    schedule_days: str
    blocked_dates: Optional[str] = None
    profile_image_url: Optional[str] = None
    shifts: List[WorkShift] = []

class PharmacyRead(SQLModel):
    id: int
    user_id: int
    address: str
    is_on_duty: bool
    phone: Optional[str] = None

class UserRead(SQLModel):
    id: int
    email: EmailStr
    role: UserRole
    location_id: Optional[int] = None
    medic_profile: Optional[MedicProfileRead] = None
    medic_profile: Optional[MedicProfileRead] = None
    pharmacy_profile: Optional[PharmacyRead] = None
    patient_profile: Optional[PatientProfile] = None
