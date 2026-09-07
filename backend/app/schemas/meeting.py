from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.participant import AllowedParticipantCreate, AllowedParticipantResponse

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    duration_minutes: int = Field(default=30, ge=5, le=480)
    is_restricted: bool = False
    password: Optional[str] = None
    allowed_participants: Optional[List[AllowedParticipantCreate]] = None

class MeetingResponse(BaseModel):
    id: int
    meeting_code: str
    title: str
    description: Optional[str] = None
    host_id: int
    scheduled_start: datetime
    duration_minutes: int
    status: str
    is_restricted: bool
    invite_link: str
    created_at: datetime
    host_name: Optional[str] = None
    has_password: bool = False
    allowed_participants_count: int = 0
    allowed_participants: Optional[List[AllowedParticipantResponse]] = None

    class Config:
        from_attributes = True

class MeetingStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(scheduled|active|ended)$")
