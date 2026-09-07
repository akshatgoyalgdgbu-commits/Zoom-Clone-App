from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    username: str
    display_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime
    last_seen: datetime
    is_online: bool

    class Config:
        from_attributes = True

# Auth Schemas
class RegisterRequest(BaseModel):
    identifier: Optional[str] = None  # username or phone
    username: Optional[str] = None
    phone: Optional[str] = None
    display_name: str

class RequestOTPRequest(BaseModel):
    identifier: str  # phone or username

class VerifyOTPRequest(BaseModel):
    identifier: str  # phone or username
    otp_code: str

class LoginRequest(BaseModel):
    identifier: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Contact Schemas
class ContactCreate(BaseModel):
    identifier: str  # username or phone

class ContactOut(BaseModel):
    owner_id: int
    contact_user_id: int
    nickname: Optional[str] = None
    added_at: datetime
    contact_user: UserOut

    class Config:
        from_attributes = True

# Reaction Schemas
class ReactionOut(BaseModel):
    id: int
    message_id: int
    user_id: int
    emoji: str
    created_at: datetime
    user_display_name: Optional[str] = None

    class Config:
        from_attributes = True

class ReactionToggleRequest(BaseModel):
    emoji: str

# Message Status Schemas
class MessageStatusOut(BaseModel):
    message_id: int
    user_id: int
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True

class StatusUpdateRequest(BaseModel):
    status: str  # sending, sent, delivered, read

# Message Schemas
class MessageReplyPreview(BaseModel):
    id: int
    sender_id: Optional[int] = None
    sender_name: Optional[str] = None
    content: str
    message_type: str = "text"

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"  # text, image, file
    attachment_url: Optional[str] = None
    reply_to_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: Optional[int] = None
    sender: Optional[UserOut] = None
    content: str
    message_type: str = "text"
    attachment_url: Optional[str] = None
    reply_to_id: Optional[int] = None
    reply_to: Optional[MessageReplyPreview] = None
    created_at: datetime
    is_deleted: bool = False
    expires_at: Optional[datetime] = None
    statuses: List[MessageStatusOut] = []
    reactions: List[ReactionOut] = []
    status: str = "sent"  # aggregated status for sender view

    class Config:
        from_attributes = True

# Conversation Member Schemas
class ConversationMemberOut(BaseModel):
    conversation_id: int
    user_id: int
    role: str
    joined_at: datetime
    user: UserOut

    class Config:
        from_attributes = True

class MemberAddRequest(BaseModel):
    user_id: int
    role: Optional[str] = "member"

class DisappearingTimerRequest(BaseModel):
    timer: str  # "off", "1h", "1d", "1w"

class ConversationCreate(BaseModel):
    is_group: bool = False
    name: Optional[str] = None
    member_ids: List[int] = []

class ConversationOut(BaseModel):
    id: int
    is_group: bool
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    created_by: Optional[int] = None
    disappearing_timer: str = "off"
    members: List[ConversationMemberOut] = []
    other_user: Optional[UserOut] = None
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

    class Config:
        from_attributes = True
