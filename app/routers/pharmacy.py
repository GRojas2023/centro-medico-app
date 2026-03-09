from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Pharmacy, User
from app.core.security import get_current_user

router = APIRouter(prefix="/pharmacies", tags=["pharmacies"])

@router.get("/duty", response_model=List[Pharmacy])
def get_pharmacies_on_duty(
    location_id: int, 
    session: Session = Depends(get_session)
):
    """Devuelve farmacias de turno hoy en la localidad X."""
    # query: Join Pharmacy with User to check location
    statement = (
        select(Pharmacy)
        .join(User)
        .where(User.location_id == location_id)
        .where(Pharmacy.is_on_duty == True)
    )
    
    pharmacies = session.exec(statement).all()
    if not pharmacies:
        # In a real app maybe return empty list, but here we can just return empty
        return []
        
    return pharmacies
