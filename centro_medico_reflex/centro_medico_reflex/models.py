import reflex as rx
from typing import Optional, List
from datetime import datetime
from enum import Enum
from sqlmodel import Field, Relationship
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
class Location(rx.Model, table=True):
    __tablename__ = "location"
    name: str = Field(index=True)
    latitude: float
    longitude: float
    
    users: List["User"] = Relationship(back_populates="location")

# 2. Usuarios y Roles
class User(rx.Model, table=True):
    __tablename__ = "user"
    email: EmailStr = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.PATIENT)
    location_id: Optional[int] = Field(default=None, foreign_key="location.id")
    
    location: Optional[Location] = Relationship(back_populates="users")
    medic_profile: Optional["MedicProfile"] = Relationship(back_populates="user")
    pharmacy_profile: Optional["Pharmacy"] = Relationship(back_populates="user")
    patient_profile: Optional["PatientProfile"] = Relationship(back_populates="user")
    
    posts: List["Post"] = Relationship(back_populates="author")
    comments: List["Comment"] = Relationship(back_populates="user")
    
    # Relaciones de citas
    reservations_as_patient: List["Reservation"] = Relationship(back_populates="patient", sa_relationship_kwargs={"foreign_keys": "Reservation.patient_id"})
    reservations_as_medic: List["Reservation"] = Relationship(back_populates="medic", sa_relationship_kwargs={"foreign_keys": "Reservation.medic_id"})

class MedicProfile(rx.Model, table=True):
    __tablename__ = "medicprofile"
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

class WorkShift(rx.Model, table=True):
    __tablename__ = "workshift"
    medic_profile_id: int = Field(foreign_key="medicprofile.id")
    day_of_week: Optional[str] = None 
    start_time: str
    end_time: str
    
    medic_profile: MedicProfile = Relationship(back_populates="shifts")

# 3. Gestión de Citas (Core)
class Reservation(rx.Model, table=True):
    __tablename__ = "reservation"
    patient_id: int = Field(foreign_key="user.id")
    medic_id: int = Field(foreign_key="user.id")
    datetime: datetime
    status: ReservationStatus = Field(default=ReservationStatus.PENDING)
    symptoms: Optional[str] = None
    
    patient: User = Relationship(back_populates="reservations_as_patient", sa_relationship_kwargs={"primaryjoin": "Reservation.patient_id==User.id"})
    medic: User = Relationship(back_populates="reservations_as_medic", sa_relationship_kwargs={"primaryjoin": "Reservation.medic_id==User.id"})

# 4. Red Social de Salud
class Post(rx.Model, table=True):
    __tablename__ = "post"
    author_id: int = Field(foreign_key="user.id")
    content: str
    image_url: Optional[str] = None
    category: PostCategory = Field(default=PostCategory.SOCIAL)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    author: User = Relationship(back_populates="posts")
    comments: List["Comment"] = Relationship(back_populates="post")

class Comment(rx.Model, table=True):
    __tablename__ = "comment"
    post_id: int = Field(foreign_key="post.id")
    user_id: int = Field(foreign_key="user.id")
    content: str
    
    post: Post = Relationship(back_populates="comments")
    user: User = Relationship(back_populates="comments")

# 5. Farmacias y Ofertas
class Pharmacy(rx.Model, table=True):
    __tablename__ = "pharmacy"
    user_id: int = Field(foreign_key="user.id", unique=True)
    address: str
    is_on_duty: bool = Field(default=False)
    phone: Optional[str] = None
    
    user: User = Relationship(back_populates="pharmacy_profile")
    offers: List["ProductOffer"] = Relationship(back_populates="pharmacy")

class PatientProfile(rx.Model, table=True):
    __tablename__ = "patientprofile"
    user_id: int = Field(foreign_key="user.id", unique=True)
    first_name: str
    last_name: str
    dni: str = Field(index=True)
    birth_date: str 
    insurance: Optional[str] = None
    
    user: User = Relationship(back_populates="patient_profile")

class ProductOffer(rx.Model, table=True):
    __tablename__ = "productoffer"
    pharmacy_id: int = Field(foreign_key="pharmacy.id")
    product_name: str
    price: float
    discount: float = Field(default=0.0)
    expiration_date: Optional[datetime] = None
    
    pharmacy: Pharmacy = Relationship(back_populates="offers")
