import json
import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger("zoom_room_manager")

class Participant:
    def __init__(
        self,
        client_id: str,
        websocket: WebSocket,
        display_name: str,
        is_host: bool = False,
        is_audio_muted: bool = False,
        is_video_muted: bool = False
    ):
        self.client_id = client_id
        self.websocket = websocket
        self.display_name = display_name
        self.is_host = is_host
        self.is_audio_muted = is_audio_muted
        self.is_video_muted = is_video_muted
        self.is_screen_sharing = False

    def to_dict(self) -> Dict[str, Any]:
        """Support both camelCase and snake_case for seamless client interop."""
        return {
            "clientId": self.client_id,
            "client_id": self.client_id,
            "displayName": self.display_name,
            "display_name": self.display_name,
            "isHost": self.is_host,
            "is_host": self.is_host,
            "isAudioMuted": self.is_audio_muted,
            "is_audio_muted": self.is_audio_muted,
            "isVideoMuted": self.is_video_muted,
            "is_video_muted": self.is_video_muted,
            "isScreenSharing": self.is_screen_sharing,
            "is_screen_sharing": self.is_screen_sharing,
        }

class MeetingRoom:
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.participants: Dict[str, Participant] = {}

    def add_participant(self, participant: Participant):
        self.participants[participant.client_id] = participant

    def remove_participant(self, client_id: str) -> Optional[Participant]:
        return self.participants.pop(client_id, None)

    def get_participant(self, client_id: str) -> Optional[Participant]:
        return self.participants.get(client_id)

    def is_empty(self) -> bool:
        return len(self.participants) == 0

    def get_participants_list(self) -> list:
        return [p.to_dict() for p in self.participants.values()]

class RoomManager:
    def __init__(self):
        # Maps meeting_code -> MeetingRoom
        self.rooms: Dict[str, MeetingRoom] = {}

    def get_or_create_room(self, meeting_code: str) -> MeetingRoom:
        clean_code = "".join(filter(str.isdigit, str(meeting_code)))
        if clean_code not in self.rooms:
            self.rooms[clean_code] = MeetingRoom(clean_code)
        return self.rooms[clean_code]

    async def connect(
        self,
        meeting_code: str,
        client_id: str,
        websocket: WebSocket,
        display_name: str,
        is_host: bool = False
    ) -> Participant:
        await websocket.accept()
        room = self.get_or_create_room(meeting_code)
        participant = Participant(
            client_id=client_id,
            websocket=websocket,
            display_name=display_name,
            is_host=is_host
        )
        room.add_participant(participant)

        # Notify existing participants that a new user has joined (support both event names)
        await self.broadcast_to_room(
            meeting_code=meeting_code,
            message={
                "type": "participant-joined",
                "client_id": client_id,
                "clientId": client_id,
                "display_name": display_name,
                "displayName": display_name,
                "is_host": is_host,
                "isHost": is_host,
                "participant": participant.to_dict()
            },
            exclude_client_id=client_id
        )

        # Send the current room participants state to the newly connected user
        await websocket.send_text(json.dumps({
            "type": "room-state",
            "participants": room.get_participants_list(),
            "self": participant.to_dict()
        }))

        return participant

    async def disconnect(self, meeting_code: str, client_id: str):
        clean_code = "".join(filter(str.isdigit, str(meeting_code)))
        room = self.rooms.get(clean_code)
        if not room:
            return

        removed = room.remove_participant(client_id)
        if removed:
            await self.broadcast_to_room(
                meeting_code=clean_code,
                message={
                    "type": "participant-left",
                    "client_id": client_id,
                    "clientId": client_id,
                    "display_name": removed.display_name,
                    "displayName": removed.display_name
                }
            )

        if room.is_empty():
            self.rooms.pop(clean_code, None)

    async def broadcast_to_room(self, meeting_code: str, message: Dict[str, Any], exclude_client_id: Optional[str] = None):
        clean_code = "".join(filter(str.isdigit, str(meeting_code)))
        room = self.rooms.get(clean_code)
        if not room:
            return

        payload = json.dumps(message)
        dead_clients = []
        for cid, participant in room.participants.items():
            if exclude_client_id and cid == exclude_client_id:
                continue
            try:
                await participant.websocket.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending message to client {cid}: {e}")
                dead_clients.append(cid)

        for dc in dead_clients:
            room.remove_participant(dc)

    async def send_to_client(self, meeting_code: str, target_client_id: str, message: Dict[str, Any]):
        clean_code = "".join(filter(str.isdigit, str(meeting_code)))
        room = self.rooms.get(clean_code)
        if not room:
            return

        target = room.get_participant(target_client_id)
        if target:
            try:
                await target.websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Error sending direct message to client {target_client_id}: {e}")
                room.remove_participant(target_client_id)

room_manager = RoomManager()
