from fastapi import APIRouter, Depends, HTTPException
from app.models import AIRecommendationRequest
from app.services.ai_agent import run_ai_recommendation

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/recommend")
async def recommend_medic(request: AIRecommendationRequest):
    """
    Recibe un prompt de texto del usuario y retorna la sugerencia del agente de IA.
    Ejemplo: 'Soy de Orán y necesito un cardiólogo urgente.'
    """
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
        
    recommendation = await run_ai_recommendation(request.prompt)
    return {"response": recommendation}
