from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.schemas.schemas import UserOut, UserUpdate
from app.core.security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserOut)
def update_current_user_profile(
    req: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.display_name is not None:
        clean_name = req.display_name.strip()
        if not clean_name:
            raise HTTPException(status_code=400, detail="Display name cannot be empty")
        current_user.display_name = clean_name
    
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url.strip()
    
    if req.phone is not None:
        current_user.phone = req.phone.strip()

    db.commit()
    db.refresh(current_user)
    return current_user
