# Zoom Clone — Full-Stack Video Conferencing Platform

A pixel-perfect, production-grade video conferencing web application replicating Zoom's user experience, design system, and meeting workflows. Built with a Next.js (App Router) TypeScript SPA frontend, FastAPI + SQLite backend, real WebRTC mesh peer-to-peer audio/video/screen sharing, and native WebSocket signaling.

---

## 1. Tech Stack & Architectural Decisions

### Frontend
- **Framework**: Next.js (App Router), React, TypeScript.
- **Styling**: Tailwind CSS with Zoom design tokens (Zoom Blue `#2D8CFF`, Charcoal Navy `#1C1C1E`, New Meeting Orange `#FF7426`, Active Green `#00A85D`, Leave Red `#E02828`).
- **Icons**: Lucide React.
- **Why**: Next.js App Router provides fast client-side routing with zero full-page reloads between dashboard, meetings, scheduling, and join screens. TypeScript guarantees type safety across WebRTC signaling payloads, chat messages, and API schemas.

### Backend
- **Framework**: FastAPI (Python 3.13), Uvicorn.
- **ORM & Database**: SQLAlchemy ORM with SQLite (`zoom_clone.db`).
- **Validation**: Pydantic v2 schemas and Pydantic Settings.
- **Spreadsheet Parsing**: `openpyxl` (for `.xlsx`) and Python's native `csv` module with multi-encoding fallback.
- **Authentication**: Salted Bcrypt password hashing and PyJWT tokens.
- **Real-Time Layer**: Native FastAPI WebSockets with in-memory room management for WebRTC signaling mesh (`offer`, `answer`, `ice-candidate`), in-room chat broadcasting, media state syncing, and host controls.
- **Why**: FastAPI's async event loop handles concurrent WebSocket connections with low latency. SQLAlchemy provides relational mapping with foreign key cascade guarantees.

---

## 2. Full Database Schema & ER Relationships

### Entity-Relationship (ER) Architecture
```
   +-----------------------------+
   |           users             |
   +-----------------------------+
   | PK id (Integer)             |
   |    name (String)            |
   |    email (String, Unique)   |
   |    password_hash (String)   |
   |    avatar_url (String, Null)|
   |    created_at (DateTime)    |
   +-----------------------------+
                 | 1
                 |
                 | has many (as host)
                 v N
   +-------------------------------------------------------+
   |                       meetings                        |
   +-------------------------------------------------------+
   | PK id (Integer)                                       |
   |    meeting_code (String(12), Unique, Indexed)         |  <-- Zoom style (e.g. 951 500 0038)
   |    title (String(255))                                |
   |    description (Text, Nullable)                       |
   | FK host_id (Integer -> users.id, ON DELETE RESTRICT)  |
   |    scheduled_start (DateTime, Indexed)                |
   |    duration_minutes (Integer, Default 30)             |
   |    status (String(20), Default 'scheduled', Indexed)  |  <-- 'scheduled', 'active', 'ended'
   |    is_restricted (Boolean, Default False)             |
   |    password_hash (String(255), Nullable)              |
   |    invite_link (String(512))                          |
   |    created_at (DateTime)                              |
   +-------------------------------------------------------+
            | 1                                     | 1
            |                                       |
            | has many                              | has many
            v N                                     v N
+------------------------------------+   +---------------------------------------+
|        allowed_participants        |   |           meeting_sessions            |
+------------------------------------+   +---------------------------------------+
| PK id (Integer)                    |   | PK id (Integer)                       |
| FK meeting_id -> meetings.id       |   | FK meeting_id -> meetings.id          |
|    name (String(255))              |   |    display_name (String(255))         |
|    email (String(255), Indexed)    |   |    email (String(255), Nullable)      |
|    phone (String(50), Nullable)    |   |    join_type (String(20))             |  <-- 'host'|'verified'|'guest'
|    has_joined (Boolean, False)     |   |    joined_at (DateTime)               |
|    joined_at (DateTime, Nullable)  |   |    left_at (DateTime, Nullable)       |
+------------------------------------+   +---------------------------------------+
  * UNIQUE(meeting_id, email)               * FK ON DELETE CASCADE
  * FK ON DELETE CASCADE
```

### Table Specifications
1. **`users`**:
   - `id` (PK, Integer, autoincrement)
   - `name` (String, not null)
   - `email` (String, unique, indexed)
   - `password_hash` (String, not null)
   - `avatar_url` (String, nullable)
   - `created_at` (DateTime, default UTC now)
2. **`meetings`**:
   - `id` (PK, Integer, autoincrement)
   - `meeting_code` (String, unique, indexed; normalized 10-digit number e.g. `9515000038`)
   - `title` (String, not null)
   - `description` (Text, nullable)
   - `host_id` (Integer, FK `users.id`, `ON DELETE RESTRICT`)
   - `scheduled_start` (DateTime, indexed, not null)
   - `duration_minutes` (Integer, default 30)
   - `status` (String, default `'scheduled'`; values: `'scheduled'`, `'active'`, `'ended'`)
   - `is_restricted` (Boolean, default False)
   - `password_hash` (String, nullable; hashed passcode for guest entry)
   - `invite_link` (String, public URL `/join/{meeting_code}`)
   - `created_at` (DateTime, default UTC now)
3. **`allowed_participants`**:
   - `id` (PK, Integer, autoincrement)
   - `meeting_id` (Integer, FK `meetings.id`, `ON DELETE CASCADE`)
   - `name` (String, not null)
   - `email` (String, indexed, not null)
   - `phone` (String, nullable)
   - `has_joined` (Boolean, default False)
   - `joined_at` (DateTime, nullable)
   - *Constraint*: `UNIQUE(meeting_id, email)` prevents duplicate entries per meeting.
4. **`meeting_sessions`**:
   - `id` (PK, Integer, autoincrement)
   - `meeting_id` (Integer, FK `meetings.id`, `ON DELETE CASCADE`)
   - `display_name` (String, not null)
   - `email` (String, nullable)
   - `join_type` (String; `'host'`, `'verified'`, or `'guest'`)
   - `joined_at` (DateTime, default UTC now)
   - `left_at` (DateTime, nullable)

---

## 3. Setup and Run Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ (tested on Node.js 24 LTS) and npm

### Backend Setup (`/backend`)
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate Python virtual environment
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Seed the SQLite database and generate sample Excel roster
python -m app.db.seed

# 5. Start the FastAPI backend server
uvicorn app.main:app --reload --port 8000
```
Backend runs at: `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).

### Frontend Setup (`/frontend`)
```bash
# 1. Open a new terminal and navigate to frontend directory
cd frontend

# 2. Install npm dependencies
npm install

# 3. Start the Next.js development server
npm run dev
```
Frontend runs at: `http://localhost:3000`.

---

## 4. Seeded Data & Demo Credentials

The backend seed script (`backend/app/db/seed.py`) automatically initializes:

1. **Default Host User**:
   - Name: `Alex Morgan (Zoom Host)`
   - Email: `alex.morgan@zoomclone.dev`
   - Password: `Password123!`
   - *Instant Demo*: Click **"Continue as Guest"** on the Sign In page for one-click authenticated access.
2. **Seeded Upcoming Meetings**:
   - `Sprint Planning & Roadmap Review`: Meeting ID `951 500 0038` (Tomorrow 10:00 AM UTC)
   - `Full-Stack Architecture Deep Dive`: Meeting ID `823 419 7701` (In 2 days 2:00 PM UTC)
3. **Seeded Recent Meetings**:
   - `Sprint Retrospective - Q3`: Meeting ID `712 304 9912` (Ended yesterday)
   - `Client Onboarding & Demo`: Meeting ID `601 445 1189` (Ended 3 days ago)
4. **Restricted Meeting with Sample Allow-List**:
   - Title: `Executive Board & Leadership Sync (Restricted)`
   - Meeting ID: `334 890 1256`
   - Meeting Passcode: `SecretMeeting2026!`
   - Seeded Attendees (also saved as `backend/sample_data/sample_attendees.xlsx` & `sample_attendees.csv`):
     - `Alice Chen` (`alice.chen@example.com`)
     - `Brian Smith` (`brian.smith@example.com`)
     - `Clara Oswald` (`clara.oswald@example.com`)
     - `David Kim` (`david.kim@example.com`)
     - `Elena Rostova` (`elena.rostova@example.com`)

---

## 5. WebRTC & WebSocket Real-Time Communication Protocol

1. **Signaling Connection**:
   - WebSocket endpoint: `ws://localhost:8000/ws/meeting/{meeting_code}?client_id={id}&display_name={name}&is_host={bool}`.
2. **Peer-to-Peer Mesh Handshake**:
   - When client A joins, the server returns the room participant roster.
   - Client A creates an `RTCPeerConnection` for each existing peer, generates an SDP `offer`, and sends it via WebSocket.
   - Target client B receives the offer, sets remote description, creates an SDP `answer`, and returns it.
   - Both peers exchange `ice-candidate` messages over the WebSocket until ICE candidate gathering succeeds and direct P2P audio/video flows.
3. **Screen Sharing**:
   - Uses `navigator.mediaDevices.getDisplayMedia({ video: true })`.
   - Uses `RTCRtpSender.replaceTrack()` to hot-swap the video stream without renegotiating connections.
   - Listens to `screenTrack.onended` to automatically revert back to the camera stream if the user clicks the browser's floating "Stop sharing" button.
4. **Host Moderation**:
   - `host-mute-user`: Forces target peer's local audio track to disable and updates icon badges.
   - `host-mute-all`: Broadcasts mute command to all attendees.
   - `host-remove-user`: Immediately terminates target's session and redirects them out of the meeting.
   - `end-meeting`: Closes room for everyone and redirects all participants to the dashboard.

---

## 6. Assumptions Made

- **Authentication**: JWT token with local storage persistence; includes a seeded default user with one-click "Continue as Guest" so the platform can be evaluated both authenticated and friction-free without manual signup.
- **P2P Topology**: Full mesh WebRTC topology (ideal for small-to-medium meeting sizes up to 6–8 participants without requiring a dedicated SFU/MCU server like Janus or mediasoup).
- **Chat History**: In-room, ephemeral chat broadcast via WebSockets scoped to the live session (persisted during meeting lifecycle, not stored permanently in SQLite).
- **In-Browser Recording**: Native `MediaRecorder` captures meeting video/audio directly in the browser and automatically downloads the `.webm` recording upon stopping.
- **Real-Time Reactions**: Live emoji reaction picker (👏, 👍, ❤️, 😂, 😮, 🎉) and "Raise Hand" (✋) broadcast via WebSockets, animating on all participants' video tiles.

---

## 7. Deployment Notes

### Frontend (e.g. Vercel)
- Environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app`
- Next.js build command: `npm run build`
- Output: Standard Next.js serverless app.

### Backend (e.g. Render / Railway)
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `DATABASE_URL`: `sqlite:///./zoom_clone.db` (or PostgreSQL if connecting to cloud RDS)
  - `SECRET_KEY`: High-entropy random secret key.
  - `CORS_ORIGINS`: Comma-separated list including your Vercel deployment URL (e.g. `https://zoom-clone-frontend.vercel.app`).
