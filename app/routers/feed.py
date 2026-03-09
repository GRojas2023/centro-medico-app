from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from app.database import get_session
from app.models import Post, User, Location, PostCreate
from app.core.security import get_current_user
from app.deps import get_current_admin_user

router = APIRouter(prefix="/feed", tags=["feed"])

@router.get("/", response_model=List[Post])
def get_feed(
    location_id: Optional[int] = None,
    page: int = 0,
    per_page: int = 10,
    session: Session = Depends(get_session),
    # Esto habilita el candado en Swagger (aunque sea opcional)
    current_user: Optional[User] = Depends(get_current_user) 
):
    query = select(Post)
    
    if location_id:
        # Join with User to filter by location
        query = query.join(User).where(User.location_id == location_id)
    
    # Pagination
    query = query.offset(page * per_page).limit(per_page).order_by(Post.created_at.desc())
    
    posts = session.exec(query).all()
    return posts

@router.post("/", response_model=Post)
def create_post(
    post_in: PostCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    post = Post(
        author_id=current_user.id,
        content=post_in.content,
        category=post_in.category,
        image_url=post_in.image_url
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post
