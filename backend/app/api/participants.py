from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Meeting, AllowedParticipant, MeetingSession
from app.schemas.participant import (
    VerifyAccessRequest,
    VerifyAccessResponse,
    AllowedParticipantResponse,
    MeetingSessionResponse
)
from app.core.security import verify_password

router = APIRouter(prefix="/meetings", tags=["Participants & Access Control"])

@router.post("/{meeting_code}/verify-access", response_model=VerifyAccessResponse)
def verify_meeting_access(
    meeting_code: str,
    data: VerifyAccessRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluate participant entry eligibility:
    1. Unrestricted meetings -> allow immediately as 'guest'.
    2. Restricted meetings:
       a. If email is in allowed_participants -> allow immediately as 'verified', update joined status.
       b. If email is not in allowed_participants -> check passcode:
          - Valid passcode -> allow as 'guest'.
          - Missing/invalid passcode -> deny with clear prompt for password.
    """
    clean_code = "".join(filter(str.isdigit, str(meeting_code)))
    meeting = db.query(Meeting).filter(Meeting.meeting_code == clean_code).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting ID '{meeting_code}' does not exist."
        )

    # 1. Unrestricted meeting
    if not meeting.is_restricted:
        return VerifyAccessResponse(
            allowed=True,
            join_type="guest",
            requires_password=False,
            display_name=data.name.strip(),
            meeting_title=meeting.title
        )

    # 2. Restricted meeting
    input_email = data.email.strip().lower() if data.email else None

    # Check allow-list if email provided
    if input_email:
        participant = (
            db.query(AllowedParticipant)
            .filter(
                AllowedParticipant.meeting_id == meeting.id,
                AllowedParticipant.email == input_email
            )
            .first()
        )
        if participant:
            participant.has_joined = True
            participant.joined_at = datetime.now(timezone.utc)
            db.commit()

            return VerifyAccessResponse(
                allowed=True,
                join_type="verified",
                requires_password=False,
                display_name=participant.name or data.name.strip(),
                meeting_title=meeting.title
            )

    # Email not on allow-list -> check password
    if meeting.password_hash:
        if data.password and verify_password(data.password, meeting.password_hash):
            return VerifyAccessResponse(
                allowed=True,
                join_type="guest",
                requires_password=False,
                display_name=data.name.strip(),
                meeting_title=meeting.title
            )
        else:
            return VerifyAccessResponse(
                allowed=False,
                join_type=None,
                requires_password=True,
                display_name=data.name.strip(),
                error="This meeting is restricted. Please enter the meeting passcode to join as a guest.",
                meeting_title=meeting.title
            )
    else:
        return VerifyAccessResponse(
            allowed=False,
            join_type=None,
            requires_password=False,
            display_name=data.name.strip(),
            error="This meeting is restricted to invited attendees only. Your email is not on the guest list.",
            meeting_title=meeting.title
        )

@router.get("/{meeting_code}/allow-list", response_model=List[AllowedParticipantResponse])
def get_meeting_allow_list(meeting_code: str, db: Session = Depends(get_db)):
    """
    Host view: return all allowed participants and their join status.
    """
    clean_code = "".join(filter(str.isdigit, str(meeting_code)))
    meeting = db.query(Meeting).filter(Meeting.meeting_code == clean_code).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    participants = (
        db.query(AllowedParticipant)
        .filter(AllowedParticipant.meeting_id == meeting.id)
        .order_by(AllowedParticipant.name.asc())
        .all()
    )
    return [AllowedParticipantResponse.model_validate(p) for p in participants]

@router.post("/{meeting_code}/session-log", response_model=MeetingSessionResponse)
def log_meeting_session(
    meeting_code: str,
    data: VerifyAccessRequest,
    join_type: str = "guest",
    db: Session = Depends(get_db)
):
    """
    Log session attendance for audit tracking.
    """
    clean_code = "".join(filter(str.isdigit, str(meeting_code)))
    meeting = db.query(Meeting).filter(Meeting.meeting_code == clean_code).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    session = MeetingSession(
        meeting_id=meeting.id,
        display_name=data.name.strip(),
        email=data.email.strip().lower() if data.email else None,
        join_type=join_type,
        joined_at=datetime.now(timezone.utc)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return MeetingSessionResponse.model_validate(session)
