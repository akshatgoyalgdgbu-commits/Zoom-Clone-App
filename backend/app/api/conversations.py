from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_

from app.db.database import get_db
from app.db.models import (
    User, Conversation, ConversationMember, Message, MessageStatus, 
    MemberRole, Reaction
)
from app.schemas.schemas import (
    ConversationCreate, ConversationOut, ConversationMemberOut,
    MemberAddRequest, DisappearingTimerRequest, UserOut, MessageOut,
    MessageReplyPreview, ReactionOut, MessageStatusOut
)
from app.core.security import get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])

def format_message_out(msg: Message, current_user_id: int) -> MessageOut:
    reply_preview = None
    if msg.reply_to:
        reply_preview = MessageReplyPreview(
            id=msg.reply_to.id,
            sender_id=msg.reply_to.sender_id,
            sender_name=msg.reply_to.sender.display_name if msg.reply_to.sender else "Unknown",
            content=msg.reply_to.content if not msg.reply_to.is_deleted else "Message deleted",
            message_type=msg.reply_to.message_type
        )
    
    # Calculate aggregated status for outgoing messages
    aggregated_status = "sent"
    if msg.statuses:
        statuses = [s.status for s in msg.statuses]
        if all(s == "read" for s in statuses):
            aggregated_status = "read"
        elif any(s in ("delivered", "read") for s in statuses):
            aggregated_status = "delivered"
        else:
            aggregated_status = "sent"

    reactions_out = [
        ReactionOut(
            id=r.id,
            message_id=r.message_id,
            user_id=r.user_id,
            emoji=r.emoji,
            created_at=r.created_at,
            user_display_name=r.user.display_name if r.user else None
        )
        for r in msg.reactions
    ]

    status_out = [
        MessageStatusOut(
            message_id=s.message_id,
            user_id=s.user_id,
            status=s.status,
            updated_at=s.updated_at
        )
        for s in msg.statuses
    ]

    return MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender=UserOut.from_orm(msg.sender) if msg.sender else None,
        content=msg.content if not msg.is_deleted else "Message deleted",
        message_type=msg.message_type,
        attachment_url=msg.attachment_url,
        reply_to_id=msg.reply_to_id,
        reply_to=reply_preview,
        created_at=msg.created_at,
        is_deleted=msg.is_deleted,
        expires_at=msg.expires_at,
        statuses=status_out,
        reactions=reactions_out,
        status=aggregated_status
    )

def build_conversation_out(conv: Conversation, current_user_id: int, db: Session) -> ConversationOut:
    members_out = []
    other_user = None
    
    for m in conv.members:
        member_out = ConversationMemberOut(
            conversation_id=m.conversation_id,
            user_id=m.user_id,
            role=m.role,
            joined_at=m.joined_at,
            user=UserOut.from_orm(m.user)
        )
        members_out.append(member_out)
        if not conv.is_group and m.user_id != current_user_id:
            other_user = UserOut.from_orm(m.user)

    # Last message
    last_msg = db.query(Message).filter(
        Message.conversation_id == conv.id,
        or_(Message.expires_at == None, Message.expires_at > datetime.utcnow())
    ).order_by(desc(Message.created_at)).first()

    last_message_out = format_message_out(last_msg, current_user_id) if last_msg else None

    # Unread count: messages where sender_id != current_user_id and my status != 'read'
    unread_count = db.query(MessageStatus).join(Message).filter(
        Message.conversation_id == conv.id,
        Message.sender_id != current_user_id,
        MessageStatus.user_id == current_user_id,
        MessageStatus.status != "read"
    ).count()

    return ConversationOut(
        id=conv.id,
        is_group=conv.is_group,
        name=conv.name if conv.is_group else (other_user.display_name if other_user else "Conversation"),
        avatar_url=conv.avatar_url if conv.is_group else (other_user.avatar_url if other_user else None),
        created_at=conv.created_at,
        created_by=conv.created_by,
        disappearing_timer=conv.disappearing_timer,
        members=members_out,
        other_user=other_user,
        last_message=last_message_out,
        unread_count=unread_count
    )

@router.get("", response_model=List[ConversationOut])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find all conversation IDs where current_user is a member
    membership_ids = db.query(ConversationMember.conversation_id).filter(
        ConversationMember.user_id == current_user.id
    ).all()
    conv_ids = [m[0] for m in membership_ids]

    if not conv_ids:
        return []

    # Query conversations
    convs = db.query(Conversation).filter(Conversation.id.in_(conv_ids)).all()

    results = [build_conversation_out(c, current_user.id, db) for c in convs]
    
    # Sort by latest message created_at or conversation created_at descending
    def sort_key(c: ConversationOut):
        if c.last_message:
            return c.last_message.created_at
        return c.created_at

    results.sort(key=sort_key, reverse=True)
    return results

@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    req: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_member_ids = list(set(req.member_ids))
    if current_user.id in clean_member_ids:
        clean_member_ids.remove(current_user.id)

    if not req.is_group:
        if not clean_member_ids:
            raise HTTPException(status_code=400, detail="Must specify a participant for direct chat")
        target_user_id = clean_member_ids[0]
        
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")

        # Check if direct conversation already exists between current_user and target_user
        subq1 = db.query(ConversationMember.conversation_id).filter(ConversationMember.user_id == current_user.id)
        existing_conv = db.query(Conversation).join(ConversationMember).filter(
            Conversation.is_group == False,
            Conversation.id.in_(subq1),
            ConversationMember.user_id == target_user_id
        ).first()

        if existing_conv:
            return build_conversation_out(existing_conv, current_user.id, db)

        # Create new 1-on-1 conversation
        conv = Conversation(
            is_group=False,
            created_at=datetime.utcnow(),
            created_by=current_user.id,
            disappearing_timer="off"
        )
        db.add(conv)
        db.flush()

        m1 = ConversationMember(conversation_id=conv.id, user_id=current_user.id, role=MemberRole.ADMIN.value, joined_at=datetime.utcnow())
        m2 = ConversationMember(conversation_id=conv.id, user_id=target_user_id, role=MemberRole.MEMBER.value, joined_at=datetime.utcnow())
        db.add_all([m1, m2])
        db.commit()
        db.refresh(conv)

        return build_conversation_out(conv, current_user.id, db)

    else:
        # Group conversation
        if not req.name or not req.name.strip():
            raise HTTPException(status_code=400, detail="Group name is required")
        if len(clean_member_ids) < 1:
            raise HTTPException(status_code=400, detail="At least 1 additional member is required to create a group")

        conv = Conversation(
            is_group=True,
            name=req.name.strip(),
            avatar_url=f"https://api.dicebear.com/7.x/identicon/svg?seed={req.name.strip()}",
            created_at=datetime.utcnow(),
            created_by=current_user.id,
            disappearing_timer="off"
        )
        db.add(conv)
        db.flush()

        # Creator is admin
        creator_member = ConversationMember(
            conversation_id=conv.id,
            user_id=current_user.id,
            role=MemberRole.ADMIN.value,
            joined_at=datetime.utcnow()
        )
        db.add(creator_member)

        # Add other members
        for uid in clean_member_ids:
            u = db.query(User).filter(User.id == uid).first()
            if u:
                db.add(ConversationMember(
                    conversation_id=conv.id,
                    user_id=uid,
                    role=MemberRole.MEMBER.value,
                    joined_at=datetime.utcnow()
                ))

        db.commit()
        db.refresh(conv)

        return build_conversation_out(conv, current_user.id, db)

@router.get("/{id}", response_model=ConversationOut)
def get_conversation(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Conversation not found or not a member")

    conv = db.query(Conversation).filter(Conversation.id == id).first()
    return build_conversation_out(conv, current_user.id, db)

@router.get("/{id}/members", response_model=List[ConversationMemberOut])
def get_conversation_members(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    members = db.query(ConversationMember).filter(ConversationMember.conversation_id == id).all()
    return [
        ConversationMemberOut(
            conversation_id=m.conversation_id,
            user_id=m.user_id,
            role=m.role,
            joined_at=m.joined_at,
            user=UserOut.from_orm(m.user)
        )
        for m in members
    ]

@router.post("/{id}/members", response_model=ConversationMemberOut, status_code=status.HTTP_201_CREATED)
def add_conversation_member(
    id: int,
    req: MemberAddRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if current user is admin in this group
    admin_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == current_user.id,
        ConversationMember.role == MemberRole.ADMIN.value
    ).first()
    if not admin_member:
        raise HTTPException(status_code=403, detail="Only conversation admins can add members")

    # Check target user exists
    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User to add not found")

    existing = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == req.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member of this conversation")

    new_member = ConversationMember(
        conversation_id=id,
        user_id=req.user_id,
        role=req.role or MemberRole.MEMBER.value,
        joined_at=datetime.utcnow()
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return ConversationMemberOut(
        conversation_id=new_member.conversation_id,
        user_id=new_member.user_id,
        role=new_member.role,
        joined_at=new_member.joined_at,
        user=UserOut.from_orm(target_user)
    )

@router.delete("/{id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_conversation_member(
    id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allow if current user is admin OR if user is removing themselves (leaving the group)
    is_self = (current_user.id == user_id)
    if not is_self:
        admin_member = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == id,
            ConversationMember.user_id == current_user.id,
            ConversationMember.role == MemberRole.ADMIN.value
        ).first()
        if not admin_member:
            raise HTTPException(status_code=403, detail="Only conversation admins can remove members")

    member_to_remove = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == user_id
    ).first()
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="Member not found in conversation")

    db.delete(member_to_remove)
    db.commit()
    return {"message": "Member removed successfully"}

@router.post("/{id}/disappearing", status_code=status.HTTP_200_OK)
def set_disappearing_timer(
    id: int,
    req: DisappearingTimerRequest,
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

    if req.timer not in ("off", "1h", "1d", "1w"):
        raise HTTPException(status_code=400, detail="Invalid timer setting. Choose 'off', '1h', '1d', or '1w'.")

    conv.disappearing_timer = req.timer
    db.commit()

    return {"message": f"Disappearing messages set to {req.timer}", "timer": req.timer}
