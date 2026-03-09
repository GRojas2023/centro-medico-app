from typing import Annotated
from fastapi import Depends, HTTPException, status
from app.models import User, UserRole
from app.core.security import get_current_user
async def get_current_active_user(current_user: Annotated[User, Depends(get_current_user)]):
    # If we had is_active field we would check it here
    return current_user

async def get_current_admin_user(current_user: Annotated[User, Depends(get_current_user)]):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user

async def get_current_medic_user(current_user: Annotated[User, Depends(get_current_user)]):
    if current_user.role != UserRole.MEDIC:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user
