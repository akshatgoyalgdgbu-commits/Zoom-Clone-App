from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.db.database import get_db
from app.db.models import Meeting, User, AllowedParticipant
from app.schemas.meeting import MeetingCreate, MeetingResponse, MeetingStatusUpdate
from app.schemas.participant import AllowedParticipantResponse
from app.api.auth import get_current_user_optional, get_current_user
from app.services.meeting_service import generate_meeting_code, build_invite_link
from app.core.security import hash_password

router = APIRouter(prefix="/meetings", tags=["Meetings"])

def enrich_meeting_response(meeting: Meeting, db: Session) -> MeetingResponse:
    """Enrich meeting model into API response format."""
    host = db.query(User).filter(User.id == meeting.host_id).first()
    allowed_list = db.query(AllowedParticipant).filter(AllowedParticipant.meeting_id == meeting.id).all()

    return MeetingResponse(
        id=meeting.id,
        meeting_code=meeting.meeting_code,
        title=meeting.title,
        description=meeting.description,
        host_id=meeting.host_id,
        scheduled_start=meeting.scheduled_start,
        duration_minutes=meeting.duration_minutes,
        status=meeting.status,
        is_restricted=meeting.is_restricted,
        invite_link=meeting.invite_link,
        created_at=meeting.created_at,
        host_name=host.name if host else "Host",
        has_password=bool(meeting.password_hash),
        allowed_participants_count=len(allowed_list),
        allowed_participants=[AllowedParticipantResponse.model_validate(p) for p in allowed_list]
    )

def get_fallback_user(db: Session) -> User:
    """Get or create default fallback host user if not logged in."""
    user = db.query(User).filter(User.email == "alex.morgan@zoomclone.dev").first()
    if not user:
        user = User(
            name="Alex Morgan (Zoom Host)",
            email="alex.morgan@zoomclone.dev",
            password_hash=hash_password("Password123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@router.post("/instant", response_model=MeetingResponse)
def create_instant_meeting(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Instantly spin up a new meeting room with a unique numeric Zoom ID.
    Status set to 'active', scheduled_start set to now.
    """
    host = current_user or get_fallback_user(db)
    meeting_code = generate_meeting_code(db)
    now = datetime.now(timezone.utc)
    invite_link = build_invite_link(meeting_code)

    new_meeting = Meeting(
        meeting_code=meeting_code,
        title=f"{host.name}'s Personal Meeting",
        description="Instant meeting room created via Zoom Clone.",
        host_id=host.id,
        scheduled_start=now,
        duration_minutes=45,
        status="active",
        is_restricted=False,
        password_hash=None,
        invite_link=invite_link
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    return enrich_meeting_response(new_meeting, db)

@router.post("/schedule", response_model=MeetingResponse)
def schedule_meeting(
    data: MeetingCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Schedule a meeting for a future date/time with optional restriction & allow-list.
    """
    host = current_user or get_fallback_user(db)
    meeting_code = generate_meeting_code(db)
    invite_link = build_invite_link(meeting_code)

    scheduled_time = data.scheduled_start or datetime.now(timezone.utc)
    hashed_pwd = hash_password(data.password) if (data.is_restricted and data.password) else None

    new_meeting = Meeting(
        meeting_code=meeting_code,
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        host_id=host.id,
        scheduled_start=scheduled_time,
        duration_minutes=data.duration_minutes,
        status="scheduled",
        is_restricted=data.is_restricted,
        password_hash=hashed_pwd,
        invite_link=invite_link
    )
    db.add(new_meeting)
    db.flush()

    if data.is_restricted and data.allowed_participants:
        seen_emails = set()
        for p in data.allowed_participants:
            email_clean = p.email.strip().lower()
            if email_clean not in seen_emails:
                seen_emails.add(email_clean)
                allowed_p = AllowedParticipant(
                    meeting_id=new_meeting.id,
                    name=p.name.strip(),
                    email=email_clean,
                    phone=p.phone.strip() if p.phone else None
                )
                db.add(allowed_p)

    db.commit()
    db.refresh(new_meeting)
    return enrich_meeting_response(new_meeting, db)

@router.get("/upcoming", response_model=List[MeetingResponse])
def get_upcoming_meetings(db: Session = Depends(get_db)):
    """
    Fetch upcoming meetings sorted by scheduled start time (ascending).
    """
    meetings = (
        db.query(Meeting)
        .filter(or_(Meeting.status == "scheduled", Meeting.status == "active"))
        .order_by(asc(Meeting.scheduled_start))
        .limit(20)
        .all()
    )
    return [enrich_meeting_response(m, db) for m in meetings]

@router.get("/recent", response_model=List[MeetingResponse])
def get_recent_meetings(db: Session = Depends(get_db)):
    """
    Fetch recently completed or past meetings sorted by time (descending).
    """
    meetings = (
        db.query(Meeting)
        .filter(Meeting.status == "ended")
        .order_by(desc(Meeting.scheduled_start))
        .limit(20)
        .all()
    )
    if len(meetings) < 3:
        all_meetings = (
            db.query(Meeting)
            .order_by(desc(Meeting.created_at))
            .limit(10)
            .all()
        )
        return [enrich_meeting_response(m, db) for m in all_meetings]
    return [enrich_meeting_response(m, db) for m in meetings]

@router.get("/{meeting_code}", response_model=MeetingResponse)
def get_meeting_by_code(meeting_code: str, db: Session = Depends(get_db)):
    """
    Find meeting details by meeting code (normalized digits).
    """
    clean_code = "".join(filter(str.isdigit, str(meeting_code)))
    meeting = db.query(Meeting).filter(Meeting.meeting_code == clean_code).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting ID '{meeting_code}' not found. Please verify the meeting number."
        )
    return enrich_meeting_response(meeting, db)

@router.patch("/{meeting_code}/status", response_model=MeetingResponse)
def update_meeting_status(
    meeting_code: str,
    update: MeetingStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Update meeting status ('scheduled', 'active', 'ended').
    """
    clean_code = "".join(filter(str.isdigit, str(meeting_code)))
    meeting = db.query(Meeting).filter(Meeting.meeting_code == clean_code).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    meeting.status = update.status
    db.commit()
    db.refresh(meeting)
    return enrich_meeting_response(meeting, db)

@router.get("", response_model=List[MeetingResponse])
@router.get("/", response_model=List[MeetingResponse])
def get_all_meetings(db: Session = Depends(get_db)):
    """
    Fetch all meetings sorted by created time (descending).
    """
    meetings = (
        db.query(Meeting)
        .order_by(desc(Meeting.created_at))
        .limit(50)
        .all()
    )
    return [enrich_meeting_response(m, db) for m in meetings]

@router.post("", response_model=MeetingResponse)
@router.post("/", response_model=MeetingResponse)
def create_or_schedule_meeting(
    data: MeetingCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return schedule_meeting(data=data, current_user=current_user, db=db)

@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = None
    if meeting_id.isdigit():
        meeting = db.query(Meeting).filter((Meeting.id == int(meeting_id)) | (Meeting.meeting_code == meeting_id)).first()
    if not meeting:
        clean_code = "".join(filter(str.isdigit, str(meeting_id)))
        meeting = db.query(Meeting).filter(Meeting.meeting_code == clean_code).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    db.query(AllowedParticipant).filter(AllowedParticipant.meeting_id == meeting.id).delete()
    db.delete(meeting)
    db.commit()
    return {"message": "Meeting successfully deleted", "meeting_id": meeting_id}
