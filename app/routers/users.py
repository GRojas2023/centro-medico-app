from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
import shutil
import os
import uuid
from sqlmodel import Session, select
from typing import List
from sqlalchemy.orm import selectinload
from app.database import get_session
from app.models import User, UserCreate, UserRole, MedicProfile, MedicProfileUpdate, PharmacyUpdate, UserRead, PatientProfile, Location
from app.deps import get_current_user, get_current_admin_user
from app.core.security import get_password_hash

router = APIRouter(prefix="/users", tags=["users"])


def get_user_with_relationships(session: Session, user_id: int):
    return session.exec(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.medic_profile).selectinload(MedicProfile.shifts),
            selectinload(User.pharmacy_profile),
            selectinload(User.patient_profile),
        )
    ).first()

@router.get("/me", response_model=UserRead)
def read_users_me(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = get_user_with_relationships(session, current_user.id)
    return user

@router.get("/", response_model=List[UserRead])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    role: UserRole = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    query = select(User).options(
        selectinload(User.medic_profile).selectinload(MedicProfile.shifts), 
        selectinload(User.pharmacy_profile),
        selectinload(User.patient_profile),
    )
    if role:
        query = query.where(User.role == role)
    return session.exec(query.offset(skip).limit(limit)).all()

@router.post("/", response_model=UserRead)
def create_user(
    user_in: UserCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    user = session.exec(select(User).where(User.email == user_in.email)).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")

    location_id = user_in.location_id
    if location_id is not None:
        location = session.get(Location, location_id)
        if not location:
            location_id = None
    
    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        location_id=location_id
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # If creating a medic, create a default empty profile
    if user.role == UserRole.MEDIC:
        profile = MedicProfile(
            user_id=user.id,
            specialty="General",
            license_number="PENDING",
            bio="Perfil creado por el administrador."
        )
        session.add(profile)
        session.commit()
        
    # If creating a pharmacy, create a default empty profile
    if user.role == UserRole.PHARMACY:
        from app.models import Pharmacy
        profile = Pharmacy(
            user_id=user.id,
            address="Dirección pendiente",
            is_on_duty=False,
            phone="Pendiente"
        )
        session.add(profile)
        session.commit()

    return get_user_with_relationships(session, user.id)

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cascade delete manual cleanup if needed
    if user.medic_profile:
        session.delete(user.medic_profile)
        
    session.delete(user)
    session.commit()
    return {"ok": True}

@router.patch("/medic/{medic_id}/profile", response_model=UserRead)
def update_medic_profile(
    medic_id: int,
    profile_in: MedicProfileUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    user = session.get(User, medic_id)
    if not user or user.role != UserRole.MEDIC:
        raise HTTPException(status_code=404, detail="Medic not found")
        
    if not user.medic_profile:
        # Should exist, but just in case
        profile = MedicProfile(user_id=user.id, specialty="General", license_number="TBD")
        session.add(profile)
    
    profile = user.medic_profile
    profile_data = profile_in.dict(exclude_unset=True)

    # Handle Shifts Update
    if "shifts" in profile_data:
        shifts_in = profile_data.pop("shifts")
        # Clear existing
        from app.models import WorkShift # Lazy import
        existing_shifts = session.exec(select(WorkShift).where(WorkShift.medic_profile_id == profile.id)).all()
        for s in existing_shifts:
            session.delete(s)
        
        # Add new
        for s_in in shifts_in:
            new_shift = WorkShift(
                medic_profile_id=profile.id,
                start_time=s_in["start_time"],
                end_time=s_in["end_time"],
                day_of_week=s_in.get("day_of_week")
            )
            session.add(new_shift)

    for key, value in profile_data.items():
        setattr(profile, key, value)
        
    session.add(profile)
    session.commit()
    return get_user_with_relationships(session, user.id)

@router.patch("/pharmacy/{pharmacy_id}/profile", response_model=UserRead)
def update_pharmacy_profile(
    pharmacy_id: int,
    profile_in: PharmacyUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    user = session.get(User, pharmacy_id)
    if not user or user.role != UserRole.PHARMACY:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
        
    if not user.pharmacy_profile:
        from app.models import Pharmacy
        profile = Pharmacy(user_id=user.id, address="Pendiente", is_on_duty=False, phone="Pendiente")
        session.add(profile)
    
    profile = user.pharmacy_profile
    profile_data = profile_in.dict(exclude_unset=True)
    for key, value in profile_data.items():
        setattr(profile, key, value)
        
    session.add(profile)
    session.commit()
    return get_user_with_relationships(session, user.id)
@router.get("/patient-lookup", response_model=PatientProfile)
def lookup_patient(
    dni: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    profile = session.exec(select(PatientProfile).where(PatientProfile.dni == dni)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient not found")
    return profile

@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_admin_user)
):
    try:
        if not file.filename:
             raise HTTPException(status_code=400, detail="No file uploaded")
             
        file_extension = file.filename.split(".")[-1]
        new_filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Ensure directory exists
        os.makedirs("app/static/uploads", exist_ok=True)
        
        file_location = f"app/static/uploads/{new_filename}"
        
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return full URL
        url = f"http://localhost:8000/static/uploads/{new_filename}"
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.patch("/me/medic-profile", response_model=UserRead)
def update_my_medic_profile(
    profile_in: MedicProfileUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Allow a logged-in MEDIC to update their own profile.
    """
    if current_user.role != UserRole.MEDIC:
        raise HTTPException(status_code=403, detail="Only medics can update this profile")
        
    if not current_user.medic_profile:
        # Should exist if user is medic, but create just in case
        profile = MedicProfile(user_id=current_user.id, specialty="General", license_number="TBD")
        session.add(profile)
        session.commit()
        session.refresh(current_user)
    
    profile = current_user.medic_profile
    profile_data = profile_in.dict(exclude_unset=True)

    # Handle Shifts Update
    if "shifts" in profile_data:
        shifts_in = profile_data.pop("shifts")
        # Clear existing
        from app.models import WorkShift 
        existing_shifts = session.exec(select(WorkShift).where(WorkShift.medic_profile_id == profile.id)).all()
        for s in existing_shifts:
            session.delete(s)
        
        # Add new
        for s_in in shifts_in:
            new_shift = WorkShift(
                medic_profile_id=profile.id,
                start_time=s_in["start_time"],
                end_time=s_in["end_time"],
                day_of_week=s_in.get("day_of_week")
            )
            session.add(new_shift)

    for key, value in profile_data.items():
        setattr(profile, key, value)
        
    session.add(profile)
    session.commit()
    return get_user_with_relationships(session, current_user.id)
