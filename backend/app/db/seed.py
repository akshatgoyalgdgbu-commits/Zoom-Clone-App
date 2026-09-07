from datetime import datetime, timedelta, timezone
import os
import openpyxl
from app.db.database import engine, SessionLocal, Base
from app.db.models import User, Meeting, AllowedParticipant, MeetingSession
from app.core.security import hash_password
from app.services.meeting_service import build_invite_link

def generate_sample_excel(filepath: str):
    """Generate sample_attendees.xlsx for demonstration and upload testing."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Attendees"
    
    headers = ["Name", "Email", "Phone"]
    ws.append(headers)
    
    sample_rows = [
        ["Alice Chen", "alice.chen@example.com", "+1-555-0101"],
        ["Brian Smith", "brian.smith@example.com", "+1-555-0102"],
        ["Clara Oswald", "clara.oswald@example.com", "+1-555-0103"],
        ["David Kim", "david.kim@example.com", "+1-555-0104"],
        ["Elena Rostova", "elena.rostova@example.com", "+1-555-0105"],
    ]
    for row in sample_rows:
        ws.append(row)
        
    wb.save(filepath)
    print(f"[OK] Generated sample Excel file: {filepath}")

def seed_database():
    """Seed the database with default host user, meetings, allow-list, and sessions."""
    print("--- Initializing Database Tables ---")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Default Host User
        host_email = "alex.morgan@zoomclone.dev"
        user = db.query(User).filter(User.email == host_email).first()
        if not user:
            user = User(
                name="Alex Morgan (Zoom Host)",
                email=host_email,
                password_hash=hash_password("Password123!")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[OK] Seeded default host user: {user.email} (Password: Password123!)")
        else:
            print(f"[OK] Default host user already exists: {user.email}")

        now = datetime.now(timezone.utc)

        # 2. Upcoming Meetings
        meetings_data = [
            {
                "meeting_code": "9515000038",
                "title": "Sprint Planning & Roadmap Review",
                "description": "Weekly engineering sprint planning, feature estimates, and milestone alignment.",
                "scheduled_start": now + timedelta(days=1, hours=2),
                "duration_minutes": 45,
                "status": "scheduled",
                "is_restricted": False,
                "password": None,
                "allow_list": []
            },
            {
                "meeting_code": "8234197701",
                "title": "Full-Stack Architecture Deep Dive",
                "description": "Reviewing system scalability, WebRTC signaling mesh, and Next.js App Router optimizations.",
                "scheduled_start": now + timedelta(days=2, hours=4),
                "duration_minutes": 60,
                "status": "scheduled",
                "is_restricted": False,
                "password": None,
                "allow_list": []
            },
            {
                "meeting_code": "3348901256",
                "title": "Executive Board & Leadership Sync (Restricted)",
                "description": "Confidential executive sync. Requires verified roster email or valid meeting passcode.",
                "scheduled_start": now + timedelta(hours=4),
                "duration_minutes": 60,
                "status": "scheduled",
                "is_restricted": True,
                "password": "SecretMeeting2026!",
                "allow_list": [
                    ("Alice Chen", "alice.chen@example.com", "+1-555-0101"),
                    ("Brian Smith", "brian.smith@example.com", "+1-555-0102"),
                    ("Clara Oswald", "clara.oswald@example.com", "+1-555-0103"),
                    ("David Kim", "david.kim@example.com", "+1-555-0104"),
                    ("Elena Rostova", "elena.rostova@example.com", "+1-555-0105"),
                ]
            },
            # 3. Recent/Past Meetings
            {
                "meeting_code": "7123049912",
                "title": "Sprint Retrospective - Q3",
                "description": "Retrospective on team velocity, delivery highlights, and developer experience.",
                "scheduled_start": now - timedelta(days=1, hours=3),
                "duration_minutes": 45,
                "status": "ended",
                "is_restricted": False,
                "password": None,
                "allow_list": []
            },
            {
                "meeting_code": "6014451189",
                "title": "Client Onboarding & Demo",
                "description": "Platform walkthrough and enterprise onboarding session.",
                "scheduled_start": now - timedelta(days=3, hours=5),
                "duration_minutes": 30,
                "status": "ended",
                "is_restricted": False,
                "password": None,
                "allow_list": []
            }
        ]

        for m_data in meetings_data:
            code = m_data["meeting_code"]
            meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
            if not meeting:
                pwd_hash = hash_password(m_data["password"]) if m_data["password"] else None
                meeting = Meeting(
                    meeting_code=code,
                    title=m_data["title"],
                    description=m_data["description"],
                    host_id=user.id,
                    scheduled_start=m_data["scheduled_start"],
                    duration_minutes=m_data["duration_minutes"],
                    status=m_data["status"],
                    is_restricted=m_data["is_restricted"],
                    password_hash=pwd_hash,
                    invite_link=build_invite_link(code),
                    created_at=now - timedelta(days=2)
                )
                db.add(meeting)
                db.flush()

                # Add allow-list attendees if present
                for name, email, phone in m_data["allow_list"]:
                    p = AllowedParticipant(
                        meeting_id=meeting.id,
                        name=name,
                        email=email.lower(),
                        phone=phone,
                        has_joined=False
                    )
                    db.add(p)

                db.commit()
                print(f"[OK] Seeded meeting: [{code}] {m_data['title']} (Restricted: {m_data['is_restricted']})")
            else:
                print(f"[OK] Meeting [{code}] already exists")

        # 4. Seed sample Excel file
        sample_xlsx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../sample_data/sample_attendees.xlsx"))
        generate_sample_excel(sample_xlsx_path)

        print("\n--- Database Seeding Complete! ---")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
