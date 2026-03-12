import reflex as rx
from rxconfig import config
from . import models

from sqlmodel import select
from sqlalchemy.orm import selectinload
from typing import Optional
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

# Auth Constants (Should be in .env in production)
SECRET_KEY = "tu_clave_secreta_super_segura"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthState(rx.State):
    """The authentication state."""
    email: str = ""
    password: str = ""
    user: Optional[models.User] = None
    
    def login(self):
        print(f"Attempting login for: {self.email}")
        with rx.session() as session:
            user = session.exec(select(models.User).where(models.User.email == self.email)).first()
            print(f"User found: {user}")
            if user:
                verification = pwd_context.verify(self.password, user.password_hash)
                print(f"Password verification: {verification}")
                if verification:
                    self.user = user
                    return rx.redirect("/dashboard")
            
            print("Login failed")
            return rx.window_alert("Credenciales incorrectas")

    def logout(self):
        self.user = None
        return rx.redirect("/")

    def handle_key(self, key: str):
        if key == "Enter":
            return self.login()

class MedicState(rx.State):
    """The state for managing medics."""
    medics: list[models.User] = []
    
    def get_medics(self):
        with rx.session() as session:
            # Query users with role MEDIC and load their profile
            self.medics = session.exec(
                select(models.User)
                .where(models.User.role == models.UserRole.MEDIC)
                .options(selectinload(models.User.medic_profile))
            ).all()
            
            # Fix URLs to point to local assets
            for medic in self.medics:
                if medic.medic_profile and medic.medic_profile.profile_image_url:
                    print(f"RAW URL DB: {medic.medic_profile.profile_image_url}")
                    # Try more robust replacement
                    new_url = medic.medic_profile.profile_image_url
                    if "localhost:8000" in new_url:
                         new_url = "/static" + new_url.split("/static")[-1]
                    medic.medic_profile.profile_image_url = new_url
                    print(f"NEW URL: {medic.medic_profile.profile_image_url}")

class BookingState(rx.State):
    """The state for managing the booking flow."""
    show_dialog: bool = False
    selected_medic: Optional[models.User] = None
    
    # Form data
    selected_date: str = datetime.now().strftime("%Y-%m-%d")
    selected_time: str = ""
    symptoms: str = ""
    
    # Patient Profile data
    first_name: str = ""
    last_name: str = ""
    dni: str = ""
    birth_date: str = ""
    insurance: str = ""
    
    async def open_booking(self, medic: models.User):
        auth_state = await self.get_state(AuthState)
        self.selected_medic = medic
        self.show_dialog = True
        # Reset form on open
        self.selected_time = ""
        self.symptoms = ""
        
        if auth_state.user:
            with rx.session() as session:
                # Query fresh user data to avoid DetachedInstanceError
                current_user = session.exec(
                    select(models.User)
                    .where(models.User.id == auth_state.user.id)
                    .options(selectinload(models.User.patient_profile))
                ).first()
                
                if current_user and current_user.patient_profile:
                    p = current_user.patient_profile
                    self.first_name = p.first_name
                    self.last_name = p.last_name
                    self.dni = p.dni
                    self.birth_date = p.birth_date or ""
                    self.insurance = p.insurance or ""

    def close_booking(self):
        self.show_dialog = False

    async def save_reservation(self):
        auth_state = await self.get_state(AuthState)
        if not self.selected_time:
            return rx.window_alert("Por favor seleccione un horario")
            
        with rx.session() as session:
            # 1. Update or Create Patient Profile
            user = session.exec(select(models.User).where(models.User.id == auth_state.user.id)).first()
            if not user.patient_profile:
                profile = models.PatientProfile(
                    user_id=user.id,
                    first_name=self.first_name,
                    last_name=self.last_name,
                    dni=self.dni,
                    birth_date=self.birth_date,
                    insurance=self.insurance
                )
                session.add(profile)
            else:
                user.patient_profile.first_name = self.first_name
                user.patient_profile.last_name = self.last_name
                user.patient_profile.dni = self.dni
                user.patient_profile.birth_date = self.birth_date
                user.patient_profile.insurance = self.insurance
            
            # 2. Create Reservation
            res_datetime = datetime.strptime(f"{self.selected_date} {self.selected_time}", "%Y-%m-%d %H:%M")
            new_res = models.Reservation(
                patient_id=auth_state.user.id,
                medic_id=self.selected_medic.id,
                datetime=res_datetime,
                symptoms=self.symptoms,
                status=models.ReservationStatus.PENDING
            )
            session.add(new_res)
            session.commit()
            
        self.show_dialog = False
        return rx.window_alert("¡Reserva confirmada con éxito!")

def booking_dialog() -> rx.Component:
    return rx.dialog.root(
        rx.dialog.content(
            rx.dialog.title(f"Reservar turno con el Dr. {BookingState.selected_medic.email}"),
            rx.dialog.description("Complete los detalles para confirmar su cita médica."),
            rx.divider(margin_y="4"),
            rx.vstack(
                rx.hstack(
                    rx.vstack(
                        rx.text("Fecha", size="1", weight="bold"),
                        rx.input(type="date", value=BookingState.selected_date, on_change=BookingState.set_selected_date),
                        align_items="start", width="50%"
                    ),
                    rx.vstack(
                        rx.text("Hora", size="1", weight="bold"),
                        rx.input(type="time", on_change=BookingState.set_selected_time),
                        align_items="start", width="50%"
                    ),
                    width="100%", spacing="4"
                ),
                rx.text("Detalles del Paciente", size="2", weight="bold", margin_top="4"),
                rx.box(
                    rx.input(placeholder="Nombre", value=BookingState.first_name, on_change=BookingState.set_first_name),
                    rx.input(placeholder="Apellido", value=BookingState.last_name, on_change=BookingState.set_last_name),
                    rx.input(placeholder="DNI", value=BookingState.dni, on_change=BookingState.set_dni),
                    rx.vstack(
                        rx.text("Fecha Nacimiento", size="1", weight="bold"),
                        rx.input(type="date", value=BookingState.birth_date, on_change=BookingState.set_birth_date),
                        align_items="start", width="100%"
                    ),
                    rx.input(placeholder="Obra Social (opcional)", value=BookingState.insurance, on_change=BookingState.set_insurance),
                    display="grid",
                    grid_template_columns="repeat(auto-fit, minmax(200px, 1fr))",
                    gap="0.75rem",
                    width="100%"
                ),
                rx.text("Síntomas o Motivo de consulta", size="1", weight="bold"),
                rx.text_area(placeholder="Escriba aquí...", on_change=BookingState.set_symptoms, width="100%"),
                spacing="4", width="100%"
            ),
            rx.hstack(
                rx.dialog.close(rx.button("Cancelar", variant="soft", color_scheme="gray")),
                rx.button("Confirmar Reserva", on_click=BookingState.save_reservation, color_scheme="blue"),
                margin_top="6", justify="end", spacing="3"
            ),
            padding="2em", max_width="600px"
        ),
        open=BookingState.show_dialog,
        on_open_change=BookingState.set_show_dialog
    )

def medic_card(medic: models.User) -> rx.Component:
    return rx.box(
        rx.hstack(
            rx.avatar(fallback="MD", src=medic.medic_profile.profile_image_url, size="5", radius="full"),
            rx.vstack(
                rx.text(f"Dr. {medic.email}", weight="bold", white_space="nowrap", overflow="hidden", text_overflow="ellipsis", width="100%"),
                rx.text(medic.medic_profile.specialty, color="gray", size="2"),
                align_items="start",
                spacing="1",
                width="100%",
                overflow="hidden"
            ),
            spacing="4",
            align_items="center",
            width="100%"
        ),
        padding="4",
        border="1px solid #eaeaea",
        border_radius="lg",
        width="100%",
        min_width="250px",
        bg="white",
        _hover={"bg": "gray.50", "shadow": "md", "cursor": "pointer"},
        on_click=lambda: BookingState.open_booking(medic)
    )

def patient_dashboard_content() -> rx.Component:
    return rx.vstack(
        rx.heading("Directorio de Profesionales", size="5", margin_bottom="4"),
        rx.box(
            rx.foreach(MedicState.medics, medic_card),
            display="grid",
            grid_template_columns="repeat(auto-fit, minmax(250px, 1fr))",
            gap="1rem",
            width="100%"
        ),
        width="100%",
        on_mount=MedicState.get_medics
    )

def admin_dashboard_content() -> rx.Component:
    return rx.vstack(
        rx.heading("Panel de Administración", size="5"),
        rx.text("Gestión de Usuarios y Médicos (Próximamente)"),
        rx.box(
            rx.card(rx.text("Total Médicos: ", MedicState.medics.length())),
            rx.card(rx.text("Configuración Global")),
            display="grid",
            grid_template_columns="repeat(auto-fit, minmax(250px, 1fr))",
            gap="1rem"
        ),
        width="100%"
    )

def medic_dashboard_content() -> rx.Component:
    return rx.vstack(
        rx.heading("Mi Agenda", size="5"),
        rx.text("Próximos Turnos (Próximamente)"),
        width="100%"
    )

def dashboard_page() -> rx.Component:
    return rx.container(
        rx.hstack(
            rx.heading("Centro Médico", size="6", color_scheme="blue"),
            rx.spacer(),
            rx.vstack(
                rx.text(f"{AuthState.user.email}", size="2", weight="bold"),
                rx.badge(AuthState.user.role, color_scheme="green"),
                align_items="end",
                spacing="0"
            ),
            rx.button("Salir", on_click=AuthState.logout, size="2", variant="outline"),
            width="100%",
            padding_bottom="4",
            border_bottom="1px solid #eaeaea",
            margin_bottom="6",
            align_items="center"
        ),
        # Role-based content switching
        rx.cond(
            AuthState.user.role == "admin",
            admin_dashboard_content(),
            rx.cond(
                AuthState.user.role == "medic",
                medic_dashboard_content(),
                patient_dashboard_content()
            )
        ),
        booking_dialog(),
        padding="2em",
        max_width="1200px"
    )

def login_page() -> rx.Component:
    return rx.center(
        rx.vstack(
            rx.heading("Iniciar Sesión", size="7"),
            rx.input(placeholder="Email", on_change=AuthState.set_email, width="100%"),
            rx.input(type="password", placeholder="Contraseña", on_change=AuthState.set_password, width="100%", on_key_down=AuthState.handle_key),
            rx.button("Ingresar", on_click=AuthState.login, width="100%"),
            spacing="4",
            padding="2em",
            border="1px solid #eaeaea",
            border_radius="1em",
            width="400px",
            bg="white",
            box_shadow="lg"
        ),
        height="100vh",
        bg="gray.50"
    )

app = rx.App()
app.add_page(login_page, route="/")
app.add_page(dashboard_page, route="/dashboard")
# app.api.mount("/static", StaticFiles(directory=static_dir), name="static")
