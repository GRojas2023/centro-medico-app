from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

from app.database import create_db_and_tables
from app.routers import auth, feed, pharmacy, appointments, ai, users

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas en DB al arrancar
    create_db_and_tables()
    yield

app = FastAPI(
    title="SaltaSalud API",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True}
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://centro-medico-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(feed.router)
app.include_router(pharmacy.router)
app.include_router(appointments.router)
app.include_router(ai.router)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def root():
    return {"message": "Bienvenido a SaltaSalud API"}

# --- Forzar aparición del botón Authorize ---
from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="SaltaSalud API",
        version="1.0.0",
        description="Plataforma de salud y red social profesional para Salta.",
        routes=app.routes,
    )
    # Agregar esquema de seguridad manualmente
    openapi_schema["components"]["securitySchemes"] = {
        "OAuth2PasswordBearer": {
            "type": "oauth2",
            "flows": {
                "password": {
                    "tokenUrl": "/auth/login",
                    "scopes": {}
                }
            }
        }
    }
    # Forzar que la seguridad aplique globalmente para que aparezca el botón sí o sí
    openapi_schema["security"] = [{"OAuth2PasswordBearer": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
