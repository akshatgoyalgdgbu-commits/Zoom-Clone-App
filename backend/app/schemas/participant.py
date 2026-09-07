from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class AllowedParticipantCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None

class AllowedParticipantResponse(BaseModel):
    id: int
    meeting_id: int
    name: str
    email: str
    phone: Optional[str] = None
    has_joined: bool
    joined_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VerifyAccessRequest(BaseModel):
    name: str
    email: Optional[str] = None
    password: Optional[str] = None

class VerifyAccessResponse(BaseModel):
    allowed: bool
    join_type: Optional[str] = None  # 'host', 'verified', 'guest'
    requires_password: bool = False
    display_name: str
    error: Optional[str] = None
    meeting_title: Optional[str] = None

class MeetingSessionResponse(BaseModel):
    id: int
    meeting_id: int
    display_name: str
    email: Optional[str] = None
    join_type: str
    joined_at: datetime
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True
