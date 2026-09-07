import json
from datetime import datetime
from typing import Dict, Set, Optional, List, Iterable
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.db.models import User, ConversationMember

class ConnectionManager:
    def __init__(self):
        # Map user_id -> Set of active WebSocket connections (multi-tab / multi-device)
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    def is_user_online(self, user_id: int) -> bool:
        return bool(self.active_connections.get(user_id))

    async def connect(self, websocket: WebSocket, user_id: int, db: Session):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        is_first_connection = (len(self.active_connections[user_id]) == 0)
        self.active_connections[user_id].add(websocket)
        print(f"[WS] User {user_id} connected. Total active tabs/devices for user: {len(self.active_connections[user_id])}", flush=True)

        if is_first_connection:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_online = True
                user.last_seen = datetime.utcnow()
                db.commit()
                # Broadcast presence to conversation peers
                await self.broadcast_presence(user_id=user_id, is_online=True, last_seen=user.last_seen, db=db)

    async def disconnect(self, websocket: WebSocket, user_id: int, db: Session):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                print(f"[WS] User {user_id} completely disconnected (0 active sockets).", flush=True)
                
                # Update user online status
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.is_online = False
                    user.last_seen = datetime.utcnow()
                    db.commit()
                    await self.broadcast_presence(user_id=user_id, is_online=False, last_seen=user.last_seen, db=db)
            else:
                print(f"[WS] Closed one socket for user {user_id}, {len(self.active_connections[user_id])} remaining.", flush=True)

    async def send_to_user(self, user_id: int, event_type: str, data: dict):
        """Send event payload to all open sockets of a specific user."""
        sockets = self.active_connections.get(user_id)
        if not sockets:
            return  # User is offline, skip push
        
        from fastapi.encoders import jsonable_encoder
        payload = {"event": event_type, "data": jsonable_encoder(data)}
        stale_sockets = []
        for ws in list(sockets):
            try:
                await ws.send_json(payload)
            except Exception as e:
                print(f"[WS Error] Failed to send to user {user_id}: {e}", flush=True)
                stale_sockets.append(ws)
        
        for ws in stale_sockets:
            sockets.discard(ws)

    async def broadcast_to_users(self, user_ids: Iterable[int], event_type: str, data: dict):
        for uid in user_ids:
            await self.send_to_user(uid, event_type, data)

    async def broadcast_to_conversation(
        self,
        conversation_id: int,
        event_type: str,
        data: dict,
        db: Session,
        exclude_user_id: Optional[int] = None
    ):
        members = db.query(ConversationMember.user_id).filter(
            ConversationMember.conversation_id == conversation_id
        ).all()
        target_ids = [m[0] for m in members if exclude_user_id is None or m[0] != exclude_user_id]
        await self.broadcast_to_users(target_ids, event_type, data)

    async def broadcast_presence(self, user_id: int, is_online: bool, last_seen: datetime, db: Session):
        """Notify all users who share any conversation with user_id about the presence change."""
        user_conv_ids = [
            m.conversation_id for m in db.query(ConversationMember.conversation_id).filter(
                ConversationMember.user_id == user_id
            ).all()
        ]
        peer_members = db.query(ConversationMember.user_id).filter(
            ConversationMember.conversation_id.in_(user_conv_ids),
            ConversationMember.user_id != user_id
        ).distinct().all()

        peer_ids = [p[0] for p in peer_members]
        presence_data = {
            "user_id": user_id,
            "is_online": is_online,
            "last_seen": last_seen.isoformat()
        }
        await self.broadcast_to_users(peer_ids, "presence:update", presence_data)

manager = ConnectionManager()
