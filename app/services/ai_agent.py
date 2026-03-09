import math
from typing import List, Optional
from langchain.tools import tool
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from sqlmodel import Session, select
from app.models import MedicProfile, User, Location, Reservation, ReservationStatus

# --- Haversine Calculation ---
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- Tools ---

@tool
def search_medics(specialty: str, location_id: int) -> str:
    """Busca médicos por especialidad en una localidad específica (location_id)."""
    # In a real app, you would inject the DB session. Here we mock or assume global/context session.
    # returning mock string for demonstration if DB not connected, but showing query logic.
    return f"Buscando médicos {specialty} en location_id={location_id}..." 
    # Logic:
    # stmt = select(MedicProfile).join(User).where(MedicProfile.specialty == specialty, User.location_id == location_id)
    # perform query...

@tool
def check_availability(medic_id: int) -> str:
    """Verifica los huecos libres para un médico dado. Retorna lista de horarios."""
    return f"El médico {medic_id} tiene turnos disponibles hoy a las 16:00 y 17:30."

@tool
def calculate_proximity(user_lat: float, user_lon: float, medic_lat: float, medic_lon: float) -> str:
    """Calcula la distancia en km entre el usuario y el médico."""
    dist = haversine_distance(user_lat, user_lon, medic_lat, medic_lon)
    return f"{dist:.2f} km"

@tool
def find_nearest_city_medics(specialty: str, user_lat: float, user_lon: float) -> str:
    """Si no hay médico en la ciudad, busca en ciudades aledañas y sugiere turno."""
    # Mock logic
    # 1. Get all locations with medics of that specialty
    # 2. Calculate distance to each location
    # 3. Return the closest one with availability
    return f"No hay {specialty} en tu ciudad. El más cercano está en Tartagal (40km). Dr. X disponible a las 17hs."


# --- Agent Setup ---

def get_agent_executor():
    # Model - Using OpenAI as placeholder, can be replaced with Gemini via LangChain Google VertexAI
    llm = ChatOpenAI(model="gpt-4-0125-preview", temperature=0) 
    
    tools = [search_medics, check_availability, calculate_proximity, find_nearest_city_medics]
    
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """Eres 'SaltaSalud AI', un asistente médico experto en la provincia de Salta.
                Tu objetivo es ayudar al usuario a encontrar atención médica rápida y cercana.
                
                Reglas:
                1. Prioridad Geográfica: Siempre busca opciones en la localidad del usuario primero.
                2. Urgencia vs Distancia: Si es urgente, prioriza el tiempo sobre la distancia.
                3. Usa calculate_proximity para dar datos precisos.
                4. Si no hay en la ciudad, busca en vecinas.
                """
            ),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )
    
    agent = create_openai_tools_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    return agent_executor

async def run_ai_recommendation(user_input: str):
    try:
        agent = get_agent_executor()
        result = await agent.ainvoke({"input": user_input})
        return result["output"]
    except Exception as e:
        return f"Error procesando solicitud IA: {str(e)}"
