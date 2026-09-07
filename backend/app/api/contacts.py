from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.db.models import User, Contact
from app.schemas.schemas import ContactCreate, ContactOut
from app.core.security import get_current_user

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.get("", response_model=List[ContactOut])
def list_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = db.query(Contact).filter(Contact.owner_id == current_user.id).order_by(Contact.added_at.desc()).all()
    return contacts

@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def add_contact(
    req: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    identifier = req.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Identifier cannot be empty")

    target_user = db.query(User).filter(
        or_(User.username == identifier, User.phone == identifier)
    ).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with username or phone '{identifier}'"
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as a contact"
        )

    existing = db.query(Contact).filter(
        Contact.owner_id == current_user.id,
        Contact.contact_user_id == target_user.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"'{target_user.display_name}' is already in your contacts"
        )

    contact = Contact(
        owner_id=current_user.id,
        contact_user_id=target_user.id,
        added_at=datetime.utcnow()
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)

    return contact
