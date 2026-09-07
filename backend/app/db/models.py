from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    meetings = relationship("Meeting", back_populates="host", cascade="all, delete-orphan")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Zoom-style meeting code, normalized without spaces (e.g. 9515000038)
    meeting_code = Column(String(12), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    scheduled_start = Column(DateTime, index=True, nullable=False)
    duration_minutes = Column(Integer, default=30, nullable=False)
    # Status: 'scheduled', 'active', 'ended'
    status = Column(String(20), default="scheduled", index=True, nullable=False)
    is_restricted = Column(Boolean, default=False, nullable=False)
    password_hash = Column(String(255), nullable=True)
    invite_link = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    host = relationship("User", back_populates="meetings")
    allowed_participants = relationship(
        "AllowedParticipant",
        back_populates="meeting",
        cascade="all, delete-orphan",
        lazy="joined"
    )
    sessions = relationship(
        "MeetingSession",
        back_populates="meeting",
        cascade="all, delete-orphan"
    )


class AllowedParticipant(Base):
    __tablename__ = "allowed_participants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    has_joined = Column(Boolean, default=False, nullable=False)
    joined_at = Column(DateTime, nullable=True)

    # Relationships
    meeting = relationship("Meeting", back_populates="allowed_participants")

    # Composite unique constraint: an email can only be listed once per meeting
    __table_args__ = (
        UniqueConstraint("meeting_id", "email", name="uq_meeting_participant_email"),
    )


class MeetingSession(Base):
    __tablename__ = "meeting_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    # join_type: 'host', 'verified', 'guest'
    join_type = Column(String(20), nullable=False)
    joined_at = Column(DateTime, default=utc_now, nullable=False)
    left_at = Column(DateTime, nullable=True)

    # Relationships
    meeting = relationship("Meeting", back_populates="sessions")
