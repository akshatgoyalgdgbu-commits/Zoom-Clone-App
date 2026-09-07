import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.room_manager import room_manager

logger = logging.getLogger("zoom_websocket")
router = APIRouter(tags=["WebSocket Realtime"])

@router.websocket("/ws/meeting/{meeting_code}")
async def meeting_websocket_endpoint(
    websocket: WebSocket,
    meeting_code: str,
    client_id: str = Query(...),
    display_name: str = Query("Participant"),
    is_host: bool = Query(False)
):
    """
    WebSocket endpoint for in-meeting real-time communications:
    - WebRTC signaling (offer, answer, ICE candidates)
    - In-room chat broadcasting
    - Media mute/video toggle sync
    - Screen share notification
    - Host controls (mute all, mute single, remove participant, end meeting)
    - Live reactions & Hand raise
    """
    clean_code = "".join(filter(str.isdigit, str(meeting_code)))
    participant = await room_manager.connect(
        meeting_code=clean_code,
        client_id=client_id,
        websocket=websocket,
        display_name=display_name,
        is_host=is_host
    )

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            msg_type = data.get("type")

            # 1. WebRTC Signaling forwarding (offer, answer, ice-candidate)
            if msg_type in ["offer", "answer", "ice-candidate"]:
                target_id = data.get("target") or data.get("to")
                if target_id:
                    await room_manager.send_to_client(
                        meeting_code=clean_code,
                        target_client_id=target_id,
                        message={
                            "type": msg_type,
                            "from": client_id,
                            "senderName": participant.display_name,
                            "payload": data.get("payload"),
                            "candidate": data.get("candidate"),
                            "sdp": data.get("sdp")
                        }
                    )

            # 2. In-meeting chat
            elif msg_type == "chat-message":
                text = data.get("text", "").strip()
                if text:
                    await room_manager.broadcast_to_room(
                        meeting_code=clean_code,
                        message={
                            "type": "chat-message",
                            "id": data.get("id"),
                            "senderId": client_id,
                            "senderName": participant.display_name,
                            "text": text,
                            "timestamp": data.get("timestamp")
                        }
                    )

            # 3. Media mute / video state changes
            elif msg_type == "media-state":
                is_audio_muted = data.get("isAudioMuted", False)
                is_video_muted = data.get("isVideoMuted", False)
                participant.is_audio_muted = is_audio_muted
                participant.is_video_muted = is_video_muted

                await room_manager.broadcast_to_room(
                    meeting_code=clean_code,
                    message={
                        "type": "media-state",
                        "clientId": client_id,
                        "isAudioMuted": is_audio_muted,
                        "isVideoMuted": is_video_muted
                    },
                    exclude_client_id=client_id
                )

            # 4. Screen share status
            elif msg_type == "screen-share-state":
                is_sharing = data.get("isSharing", False)
                participant.is_screen_sharing = is_sharing
                await room_manager.broadcast_to_room(
                    meeting_code=clean_code,
                    message={
                        "type": "screen-share-state",
                        "clientId": client_id,
                        "client_id": client_id,
                        "isSharing": is_sharing
                    },
                    exclude_client_id=client_id
                )

            # 5. Host controls: Mute participant
            elif msg_type == "host-mute-user":
                if participant.is_host:
                    target_id = data.get("target")
                    if target_id:
                        await room_manager.send_to_client(
                            meeting_code=clean_code,
                            target_client_id=target_id,
                            message={"type": "host-muted-you"}
                        )

            # 6. Host controls: Mute All
            elif msg_type == "host-mute-all":
                if participant.is_host:
                    await room_manager.broadcast_to_room(
                        meeting_code=clean_code,
                        message={"type": "host-muted-all"},
                        exclude_client_id=client_id
                    )

            # 7. Host controls: Remove participant
            elif msg_type == "host-remove-user":
                if participant.is_host:
                    target_id = data.get("target")
                    if target_id:
                        await room_manager.send_to_client(
                            meeting_code=clean_code,
                            target_client_id=target_id,
                            message={"type": "host-removed-you", "reason": "Removed by meeting host."}
                        )
                        await room_manager.disconnect(meeting_code=clean_code, client_id=target_id)

            # 8. Host controls: End Meeting for All
            elif msg_type == "end-meeting":
                if participant.is_host:
                    await room_manager.broadcast_to_room(
                        meeting_code=clean_code,
                        message={"type": "meeting-ended", "reason": "The host has ended the meeting for everyone."}
                    )

            # 9. Real-time Emoji Reactions & Hand Raise
            elif msg_type == "reaction":
                await room_manager.broadcast_to_room(
                    meeting_code=clean_code,
                    message={
                        "type": "reaction",
                        "clientId": client_id,
                        "displayName": participant.display_name,
                        "emoji": data.get("emoji", "👍"),
                        "timestamp": data.get("timestamp")
                    }
                )

    except WebSocketDisconnect:
        await room_manager.disconnect(meeting_code=clean_code, client_id=client_id)
    except Exception as e:
        logger.warning(f"WebSocket error for client {client_id}: {e}")
        await room_manager.disconnect(meeting_code=clean_code, client_id=client_id)
