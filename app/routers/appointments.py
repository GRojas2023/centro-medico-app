from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime
from sqlmodel import Session, select
from app.database import get_session
from app.models import Reservation, ReservationCreate, ReservationStatus, User, MedicProfile
from app.deps import get_current_medic_user, get_current_user
from app.services.external import sync_calendar_event, log_to_sheets

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.post("/", response_model=Reservation)
def create_appointment(
    reservation_in: ReservationCreate, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Handle Patient Data (Upsert)
    if reservation_in.patient_data:
        p_data = reservation_in.patient_data
        # Check if profile exists for user
        # Re-fetch user with patient_profile loaded to be safe or query directly
        from app.models import PatientProfile
        existing_profile = session.exec(select(PatientProfile).where(PatientProfile.user_id == current_user.id)).first()
        
        if existing_profile:
            # Update
            existing_profile.first_name = p_data.first_name
            existing_profile.last_name = p_data.last_name
            existing_profile.dni = p_data.dni
            existing_profile.birth_date = p_data.birth_date
            existing_profile.insurance = p_data.insurance
            existing_profile.phone = p_data.phone
            session.add(existing_profile)
        else:
            # Create
            new_profile = PatientProfile(
                user_id=current_user.id,
                first_name=p_data.first_name,
                last_name=p_data.last_name,
                dni=p_data.dni,
                birth_date=p_data.birth_date,
                insurance=p_data.insurance,
                phone=p_data.phone
            )
            session.add(new_profile)
        session.commit()

    # 2. Validate Medic Exists
    from sqlalchemy.orm import selectinload
    from app.models import MedicProfile 
    query = select(User).where(User.id == reservation_in.medic_id).options(selectinload(User.medic_profile).selectinload(MedicProfile.shifts))
    medic = session.exec(query).first()
    
    if not medic:
        raise HTTPException(status_code=404, detail="Medic not found")
        
    profile = medic.medic_profile
    if profile:
        # A. Check Blocked Dates
        req_date_str = reservation_in.datetime.strftime("%Y-%m-%d")
        blocked_dates = (profile.blocked_dates or "").split(",")
        if req_date_str in blocked_dates:
            raise HTTPException(status_code=400, detail="Doctor is not available on this date (Blocked).")
            
        # B. Check Schedule Days (Global check first, though shifts can override day logic conceptually, keeping global simplicity)
        req_day = reservation_in.datetime.strftime("%a") 
        allowed_days = (profile.schedule_days or "Mon,Tue,Wed,Thu,Fri").split(",")
        if req_day not in allowed_days:
             raise HTTPException(status_code=400, detail=f"Doctor does not work on {req_day}.")
            
        # C. Check Time Range (Support Shifts)
        req_time_str = reservation_in.datetime.strftime("%H:%M")
        
        valid_time = False
        if profile.shifts and len(profile.shifts) > 0:
            # Check against any shift
            for shift in profile.shifts:
                # Filter by day if shift has specific day
                if shift.day_of_week and shift.day_of_week != req_day:
                    continue
                
                if shift.start_time <= req_time_str < shift.end_time:
                    valid_time = True
                    break
        else:
             # Legacy Fallback
             start_time = profile.start_time or "09:00"
             end_time = profile.end_time or "17:00"
             if start_time <= req_time_str < end_time:
                 valid_time = True
        
        if not valid_time:
             raise HTTPException(status_code=400, detail="Appointment time is outside of doctor's working hours.")
        
    # 3. Check Overlap
    existing = session.exec(
        select(Reservation).where(
            Reservation.medic_id == reservation_in.medic_id,
            Reservation.datetime == reservation_in.datetime,
            Reservation.status != ReservationStatus.CANCELLED
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Time slot already taken")

    # 4. Create Reservation
    reservation = Reservation(
        patient_id=current_user.id, 
        medic_id=reservation_in.medic_id,
        datetime=reservation_in.datetime,
        symptoms=reservation_in.symptoms,
        status=ReservationStatus.CONFIRMED
    )
    
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    
    # 4. Background Tasks (Mock Integrations)
    background_tasks.add_task(log_to_sheets, {"id": reservation.id, "status": "Created"})
    
    return reservation

from sqlalchemy.orm import selectinload
from typing import Optional
from sqlmodel import SQLModel

from app.models import MedicProfileRead, MedicProfile

class UserMedicRead(SQLModel):
    id: int
    email: str
    medic_profile: Optional[MedicProfileRead] = None

@router.get("/medics", response_model=list[UserMedicRead])
def get_medics(session: Session = Depends(get_session)):
    from app.models import UserRole 
    from sqlalchemy.orm import selectinload
    # Include shifts in query options
    query = select(User).where(User.role == UserRole.MEDIC).options(selectinload(User.medic_profile).selectinload(MedicProfile.shifts))
    medics = session.exec(query).all()
    return medics

@router.get("/medic/{medic_id}/slots", response_model=list[Reservation])
def get_medic_slots(medic_id: int, session: Session = Depends(get_session)):
    query = select(Reservation).where(
        Reservation.medic_id == medic_id,
        Reservation.status != ReservationStatus.CANCELLED
    )
    return session.exec(query).all()

from app.deps import get_current_medic_user

class ReservationRead(SQLModel):
    id: int
    datetime: datetime
    status: ReservationStatus
    symptoms: Optional[str] = None
    medic_id: int
    patient_id: int
    # Flat fields for frontend convenience
    medic_email: Optional[str] = None
    medic_specialty: Optional[str] = None
    patient_email: Optional[str] = None


@router.get("/me", response_model=list[ReservationRead])
def get_my_appointments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from app.models import UserRole
    # Retrieve appointment history based on role (with eager loading)
    if current_user.role == UserRole.MEDIC:
        query = select(Reservation).where(Reservation.medic_id == current_user.id).options(selectinload(Reservation.patient))
    else:
        # Default to patient view (or explicitly check UserRole.PATIENT)
        query = select(Reservation).where(Reservation.patient_id == current_user.id).options(selectinload(Reservation.medic).selectinload(User.medic_profile))
        
    results = session.exec(query).all()
    
    # Map to schema
    output = []
    for res in results:
        medic_email = res.medic.email if res.medic else None
        medic_specialty = res.medic.medic_profile.specialty if res.medic and res.medic.medic_profile else None
        patient_email = res.patient.email if res.patient else None
        
        output.append(ReservationRead(
            id=res.id,
            datetime=res.datetime,
            status=res.status,
            symptoms=res.symptoms,
            medic_id=res.medic_id,
            patient_id=res.patient_id,
            medic_email=medic_email,
            medic_specialty=medic_specialty,
            patient_email=patient_email
        ))
    return output

from pydantic import BaseModel
class ReservationStatusUpdate(BaseModel):
    status: ReservationStatus

@router.patch("/{reservation_id}/status", response_model=Reservation)
def update_appointment_status(
    reservation_id: int,
    status_update: ReservationStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from app.models import UserRole
    reservation = session.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    # Permission Logic
    if current_user.role == UserRole.MEDIC:
        if reservation.medic_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not your appointment (Medic)")
    elif current_user.role == UserRole.PATIENT:
        if reservation.patient_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not your appointment (Patient)")
        if status_update.status != ReservationStatus.CANCELLED:
             raise HTTPException(status_code=403, detail="Patients can only cancel appointments")
    else:
        # Admins or others? For now restrict
         raise HTTPException(status_code=403, detail="Unauthorized role")
        
    reservation.status = status_update.status
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    return reservation
