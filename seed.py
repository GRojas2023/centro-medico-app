from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models import User, Location, MedicProfile, Pharmacy, Post, UserRole, PostCategory
from app.core.security import get_password_hash
from datetime import datetime

def get_or_create_location(session: Session, name: str, lat: float, lon: float):
    loc = session.exec(select(Location).where(Location.name == name)).first()
    if not loc:
        loc = Location(name=name, latitude=lat, longitude=lon)
        session.add(loc)
        session.commit()
        session.refresh(loc)
        print(f"Created location: {name}")
    return loc

def get_or_create_user(session: Session, email: str, password: str, role: UserRole, location: Location):
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            role=role,
            location_id=location.id
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"Created user: {email}")
    return user

def create_seed_data():
    create_db_and_tables()

    with Session(engine) as session:
        print("Verificando/Creando datos de prueba...")

        # 1. Locations
        loc_salta = get_or_create_location(session, "Salta Capital", -24.7821, -65.4232)
        loc_oran = get_or_create_location(session, "San Ramón de la Nueva Orán", -23.1322, -64.3172)
        loc_guemes = get_or_create_location(session, "General Güemes", -24.6667, -65.0500)
        loc_tartagal = get_or_create_location(session, "Tartagal", -22.5167, -63.8000)

        # 2. Users & Profiles
        # Admin
        get_or_create_user(session, "admin@saltasalud.com", "admin123", UserRole.ADMIN, loc_salta)

        # Medics
        medic_salta = get_or_create_user(session, "dr.lopez@saltasalud.com", "medico123", UserRole.MEDIC, loc_salta)
        if not medic_salta.medic_profile:
            profile = MedicProfile(
                user_id=medic_salta.id,
                specialty="Cardiología",
                license_number="MP-1234",
                bio="Especialista en hipertensión.",
                verification_status=True,
                address="Av. Belgrano 500, Consultorio 1",
                start_time="09:00", # Legacy fallback
                end_time="12:00",   # Legacy fallback
                slot_duration=20,
                schedule_days="Mon,Wed,Fri"
            )
            session.add(profile)
            session.commit()
            session.refresh(profile)
            
            # Create Split Shifts
            shift_morning = WorkShift(medic_profile_id=profile.id, start_time="09:00", end_time="12:00")
            shift_afternoon = WorkShift(medic_profile_id=profile.id, start_time="16:00", end_time="20:00")
            session.add(shift_morning)
            session.add(shift_afternoon)
            session.commit()

        medic_oran = get_or_create_user(session, "dra.gonzalez@saltasalud.com", "medico123", UserRole.MEDIC, loc_oran)
        if not medic_oran.medic_profile:
            profile = MedicProfile(
                user_id=medic_oran.id,
                specialty="Pediatría",
                license_number="MP-5678",
                bio="Atención integral de niños.",
                verification_status=True,
                address="Calle Egües 333",
                start_time="09:00",
                end_time="13:00",
                slot_duration=30,
                schedule_days="Tue,Thu"
            )
            session.add(profile)
            session.commit()

        # Pharmacies
        pharmacy_salta = get_or_create_user(session, "farma.central@saltasalud.com", "farma123", UserRole.PHARMACY, loc_salta)
        if not pharmacy_salta.pharmacy_profile:
            profile = Pharmacy(
                user_id=pharmacy_salta.id,
                address="Av. Belgrano 1234, Salta",
                is_on_duty=True,
                phone="387-4445555"
            )
            session.add(profile)
            session.commit()

        # Pharmacy Oran (NEW)
        pharmacy_oran = get_or_create_user(session, "farma.norte@saltasalud.com", "farma123", UserRole.PHARMACY, loc_oran)
        if not pharmacy_oran.pharmacy_profile:
            profile = Pharmacy(
                user_id=pharmacy_oran.id,
                address="Calle 20 de Febrero 456, Orán",
                is_on_duty=False,
                phone="3878-422222"
            )
            session.add(profile)
            session.commit()
            print("Created Pharmacy profile for Orán")

        # Patients
        get_or_create_user(session, "juan.perez@gmail.com", "paciente123", UserRole.PATIENT, loc_salta)
        get_or_create_user(session, "maria.gomez@gmail.com", "paciente123", UserRole.PATIENT, loc_guemes)

        print("Seed completado exitosamente.")

if __name__ == "__main__":
    create_seed_data()
