import random
from sqlalchemy.orm import Session
from app.db.models import Meeting

def generate_meeting_code(db: Session) -> str:
    """
    Generate a unique 10-digit Zoom-style numeric meeting code.
    Format example: '9515000038' (displayed as '951 500 0038').
    Ensures collision avoidance by checking the database.
    """
    for _ in range(20):
        # 10 digit number starting with non-zero
        code = str(random.randint(100_000_0000, 999_999_9999))
        existing = db.query(Meeting).filter(Meeting.meeting_code == code).first()
        if not existing:
            return code
    # Fallback with timestamp segment if somehow collision persists
    import time
    return str(int(time.time()))[:10]

def format_meeting_code(code: str) -> str:
    """Format a 10 or 11 digit meeting code into standard Zoom spacing: '951 500 0038'."""
    clean = "".join(filter(str.isdigit, str(code)))
    if len(clean) == 10:
        return f"{clean[0:3]} {clean[3:6]} {clean[6:10]}"
    elif len(clean) == 11:
        return f"{clean[0:3]} {clean[3:7]} {clean[7:11]}"
    return clean

def build_invite_link(code: str) -> str:
    """Build the client join URL for a given meeting code."""
    clean = "".join(filter(str.isdigit, str(code)))
    return f"/join/{clean}"
