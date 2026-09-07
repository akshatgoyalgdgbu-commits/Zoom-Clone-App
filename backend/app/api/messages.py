from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_

from app.db.database import get_db
from app.db.models import (
    User, Conversation, ConversationMember, Message, MessageStatus, 
    Reaction, MessageDeliveryStatus
)
from app.schemas.schemas import (
    MessageCreate, MessageOut, ReactionToggleRequest, StatusUpdateRequest,
    MessageReplyPreview, ReactionOut, MessageStatusOut, UserOut
)
from app.core.security import get_current_user
from app.services.websocket_manager import manager
from app.api.conversations import format_message_out

router = APIRouter(tags=["messages"])

def get_disappearing_delta(timer_str: str) -> Optional[timedelta]:
    if timer_str == "1h":
        return timedelta(hours=1)
    elif timer_str == "1d":
        return timedelta(days=1)
    elif timer_str == "1w":
        return timedelta(weeks=1)
    return None

@router.get("/conversations/{id}/messages", response_model=List[MessageOut])
def get_messages(
    id: int,
    before_id: Optional[int] = None,
    limit: int = Query(default=30, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify membership
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    # Filter out expired messages
    query = db.query(Message).filter(
        Message.conversation_id == id,
        Message.is_deleted == False,
        or_(Message.expires_at == None, Message.expires_at > datetime.utcnow())
    )

    if before_id:
        query = query.filter(Message.id < before_id)

    messages = query.order_by(desc(Message.created_at)).limit(limit).all()
    # Reverse so they are returned in chronological order
    messages.reverse()

    # Automatically mark unread messages from other users as 'read'
    unread_statuses = db.query(MessageStatus).join(Message).filter(
        Message.conversation_id == id,
        Message.sender_id != current_user.id,
        MessageStatus.user_id == current_user.id,
        MessageStatus.status != "read"
    ).all()

    if unread_statuses:
        for s in unread_statuses:
            s.status = "read"
            s.updated_at = datetime.utcnow()
        db.commit()

    return [format_message_out(m, current_user.id) for m in messages]

@router.post("/conversations/{id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    id: int,
    req: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check disappearing messages timer
    expires_at = None
    delta = get_disappearing_delta(conv.disappearing_timer)
    if delta:
        expires_at = datetime.utcnow() + delta

    # Create message
    msg = Message(
        conversation_id=id,
        sender_id=current_user.id,
        content=req.content,
        message_type=req.message_type or "text",
        attachment_url=req.attachment_url,
        reply_to_id=req.reply_to_id,
        created_at=datetime.utcnow(),
        is_deleted=False,
        expires_at=expires_at
    )
    db.add(msg)
    db.flush()

    # Create status entries for other members
    other_members = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id != current_user.id
    ).all()

    for om in other_members:
        is_online = manager.is_user_online(om.user_id)
        status_val = "delivered" if is_online else "sent"
        st = MessageStatus(
            message_id=msg.id,
            user_id=om.user_id,
            status=status_val,
            updated_at=datetime.utcnow()
        )
        db.add(st)

    db.commit()
    db.refresh(msg)

    from fastapi.encoders import jsonable_encoder
    # Format output
    msg_out = format_message_out(msg, current_user.id)
    msg_dict = jsonable_encoder(msg_out)

    # Real-time WebSocket broadcast to all participants in this conversation!
    await manager.broadcast_to_conversation(
        conversation_id=id,
        event_type="message:new",
        data=msg_dict,
        db=db
    )

    return msg_out

@router.post("/messages/{id}/reactions", response_model=MessageOut)
async def toggle_reaction(
    id: int,
    req: ReactionToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(Message.id == id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == msg.conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    existing_reaction = db.query(Reaction).filter(
        Reaction.message_id == id,
        Reaction.user_id == current_user.id,
        Reaction.emoji == req.emoji
    ).first()

    if existing_reaction:
        # Toggle off
        db.delete(existing_reaction)
        db.commit()
    else:
        # Toggle on
        reaction = Reaction(
            message_id=id,
            user_id=current_user.id,
            emoji=req.emoji,
            created_at=datetime.utcnow()
        )
        db.add(reaction)
        db.commit()

    db.refresh(msg)
    msg_out = format_message_out(msg, current_user.id)
    msg_dict = jsonable_encoder(msg_out)

    # Broadcast reaction event via WebSocket
    await manager.broadcast_to_conversation(
        conversation_id=msg.conversation_id,
        event_type="reaction:new",
        data={
            "message_id": id,
            "conversation_id": msg.conversation_id,
            "user_id": current_user.id,
            "emoji": req.emoji,
            "message": msg_dict
        },
        db=db
    )

    return msg_out

@router.patch("/messages/{id}/status", status_code=status.HTTP_200_OK)
async def update_message_status(
    id: int,
    req: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(Message.id == id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    status_record = db.query(MessageStatus).filter(
        MessageStatus.message_id == id,
        MessageStatus.user_id == current_user.id
    ).first()

    if status_record:
        status_record.status = req.status
        status_record.updated_at = datetime.utcnow()
    else:
        status_record = MessageStatus(
            message_id=id,
            user_id=current_user.id,
            status=req.status,
            updated_at=datetime.utcnow()
        )
        db.add(status_record)

    db.commit()

    # Notify sender via WebSocket
    if msg.sender_id:
        await manager.send_to_user(
            user_id=msg.sender_id,
            event_type="message:status",
            data={
                "message_id": id,
                "conversation_id": msg.conversation_id,
                "user_id": current_user.id,
                "status": req.status,
                "updated_at": status_record.updated_at.isoformat()
            }
        )

    return {"message": "Status updated", "status": req.status}
