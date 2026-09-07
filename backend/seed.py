import sys
import os
from datetime import datetime, timedelta

# Ensure app package is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import engine, Base, SessionLocal
from app.db.models import (
    User, Conversation, ConversationMember, Message, MessageStatus, 
    Reaction, Contact, MemberRole, MessageType, MessageDeliveryStatus
)

def seed_data(reset: bool = False):
    db = SessionLocal()
    try:
        if reset:
            print("[Seed] Dropping all tables and resetting database...")
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
            print("[Seed] Tables recreated cleanly.")
        else:
            Base.metadata.create_all(bind=engine)
            # If users exist and not reset, check idempotency
            if db.query(User).first():
                print("[Seed] Database already seeded. Use --reset to re-seed from scratch.")
                return

        print("[Seed] Creating users...")
        users_data = [
            {
                "username": "alice",
                "phone": "+15550101",
                "display_name": "Alice Carter",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
                "is_online": True,
            },
            {
                "username": "bob",
                "phone": "+15550102",
                "display_name": "Bob Stone",
                "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                "is_online": True,
            },
            {
                "username": "charlie",
                "phone": "+15550103",
                "display_name": "Charlie Davis",
                "avatar_url": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
                "is_online": False,
            },
            {
                "username": "diana",
                "phone": "+15550104",
                "display_name": "Diana Prince",
                "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
                "is_online": True,
            },
            {
                "username": "evan",
                "phone": "+15550105",
                "display_name": "Evan Wright",
                "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                "is_online": False,
            },
            {
                "username": "fiona",
                "phone": "+15550106",
                "display_name": "Fiona Gallagher",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                "is_online": False,
            }
        ]

        users = {}
        now = datetime.utcnow()
        for idx, ud in enumerate(users_data):
            user = User(
                username=ud["username"],
                phone=ud["phone"],
                display_name=ud["display_name"],
                avatar_url=ud["avatar_url"],
                is_online=ud["is_online"],
                created_at=now - timedelta(days=30 - idx),
                last_seen=now - timedelta(minutes=idx * 15)
            )
            db.add(user)
            db.flush()
            users[ud["username"]] = user

        print(f"[Seed] Created {len(users)} users.")

        # Contacts Setup
        print("[Seed] Establishing contacts...")
        contacts_map = [
            ("alice", "bob"), ("alice", "charlie"), ("alice", "diana"), ("alice", "evan"),
            ("bob", "alice"), ("bob", "charlie"), ("bob", "diana"),
            ("charlie", "alice"), ("charlie", "bob"),
            ("diana", "alice"), ("diana", "bob"),
            ("evan", "alice"),
            ("fiona", "alice"),
        ]
        for owner_name, contact_name in contacts_map:
            db.add(Contact(
                owner_id=users[owner_name].id,
                contact_user_id=users[contact_name].id,
                added_at=now - timedelta(days=10)
            ))
        db.flush()

        # Direct Conversation 1: Alice & Bob (20 messages)
        print("[Seed] Creating Direct Conversation: Alice & Bob...")
        conv_ab = Conversation(
            is_group=False,
            created_at=now - timedelta(days=3),
            created_by=users["alice"].id,
            disappearing_timer="off"
        )
        db.add(conv_ab)
        db.flush()

        db.add(ConversationMember(conversation_id=conv_ab.id, user_id=users["alice"].id, role=MemberRole.ADMIN.value, joined_at=now - timedelta(days=3)))
        db.add(ConversationMember(conversation_id=conv_ab.id, user_id=users["bob"].id, role=MemberRole.MEMBER.value, joined_at=now - timedelta(days=3)))
        db.flush()

        alice_bob_dialogue = [
            ("alice", "Hey Bob! Have you checked out the new SignalClone build?", 120),
            ("bob", "Hey Alice! Yes, just pulled the repo. The Molten Onyx theme looks incredible.", 115),
            ("alice", "Right? The dark mode palette with #0A0A0C background and #FF5A36 accents feels so sharp.", 110),
            ("bob", "And the monospace JetBrains Mono timestamps give it that authentic privacy-focused touch.", 105),
            ("alice", "Did you test real-time WebSockets between two tabs?", 100),
            ("bob", "Yeah! Instant delivery, single to double check read receipts work seamlessly.", 90),
            ("alice", "What about group chats and member management?", 85),
            ("bob", "Tested that too. Admins can add/remove members, and role badges display properly.", 80),
            ("alice", "Did you see the mock OTP flow? Fixed code 123456 makes local testing effortless.", 70),
            ("bob", "Yes, console logging of the OTP is super convenient.", 65),
            ("alice", "I added reactions on messages too. You can toggle emojis on any bubble.", 60),
            ("bob", "Awesome! Trying it now.", 55),
            ("bob", "We should also verify the disappearing messages timer.", 45),
            ("alice", "Good point. 1 hour, 1 day, and 1 week options are configured in the conversation settings.", 40),
            ("bob", "Let's make sure our contact search by username and phone works without hiccups.", 30),
            ("alice", "It does. If a user doesn't exist, it displays a clear 404 alert as specified.", 25),
            ("bob", "Perfect. Everything feels super snappy.", 20),
            ("alice", "Are you ready for the deployment test?", 15),
            ("bob", "All set! Testing the full verification flow now.", 10),
            ("alice", "Awesome, see you on the group channel! 🚀", 5),
        ]

        ab_msgs = []
        for sender_key, content, mins_ago in alice_bob_dialogue:
            sender = users[sender_key]
            recipient = users["bob"] if sender_key == "alice" else users["alice"]
            msg_time = now - timedelta(minutes=mins_ago)
            
            msg = Message(
                conversation_id=conv_ab.id,
                sender_id=sender.id,
                content=content,
                message_type=MessageType.TEXT.value,
                created_at=msg_time,
                is_deleted=False
            )
            db.add(msg)
            db.flush()
            ab_msgs.append(msg)

            # Status for recipient: older messages are 'read', newest is 'delivered'
            status_val = MessageDeliveryStatus.READ.value if mins_ago > 8 else MessageDeliveryStatus.DELIVERED.value
            db.add(MessageStatus(
                message_id=msg.id,
                user_id=recipient.id,
                status=status_val,
                updated_at=msg_time + timedelta(seconds=15)
            ))

        # Add reactions to Alice & Bob chat
        if len(ab_msgs) >= 4:
            db.add(Reaction(message_id=ab_msgs[1].id, user_id=users["alice"].id, emoji="🔥", created_at=now - timedelta(minutes=112)))
            db.add(Reaction(message_id=ab_msgs[1].id, user_id=users["bob"].id, emoji="👍", created_at=now - timedelta(minutes=111)))
            db.add(Reaction(message_id=ab_msgs[5].id, user_id=users["alice"].id, emoji="❤️", created_at=now - timedelta(minutes=88)))
            db.add(Reaction(message_id=ab_msgs[-1].id, user_id=users["bob"].id, emoji="🚀", created_at=now - timedelta(minutes=4)))

        # Direct Conversation 2: Alice & Charlie (16 messages)
        print("[Seed] Creating Direct Conversation: Alice & Charlie...")
        conv_ac = Conversation(
            is_group=False,
            created_at=now - timedelta(days=2),
            created_by=users["alice"].id,
            disappearing_timer="off"
        )
        db.add(conv_ac)
        db.flush()

        db.add(ConversationMember(conversation_id=conv_ac.id, user_id=users["alice"].id, role=MemberRole.ADMIN.value, joined_at=now - timedelta(days=2)))
        db.add(ConversationMember(conversation_id=conv_ac.id, user_id=users["charlie"].id, role=MemberRole.MEMBER.value, joined_at=now - timedelta(days=2)))
        db.flush()

        charlie_dialogue = [
            ("charlie", "Hey Alice, do you have a second to discuss the SQLite schema?", 180),
            ("alice", "Sure Charlie! What's up?", 175),
            ("charlie", "I see we have foreign keys on messages, reactions, and conversation_members.", 170),
            ("alice", "Yes, and PRAGMA foreign_keys=ON is enforced on every SQLite connection.", 165),
            ("charlie", "That's great. Cascading deletes on conversations will clean up orphan rows automatically.", 160),
            ("alice", "Exactly. Also indexes on conversation_id and user_id ensure fast queries even with tens of thousands of messages.", 155),
            ("charlie", "Nice! What about multi-device WebSocket support?", 150),
            ("alice", "ConnectionManager stores a set of WebSockets per user_id, so multiple browser tabs receive live updates synchronously.", 145),
            ("charlie", "That solves the duplicate tab sync problem cleanly.", 140),
            ("alice", "Yup! And offline users are safely skipped without throwing connection errors.", 135),
            ("charlie", "Has the CORS middleware been tested with credentials?", 130),
            ("alice", "Yes, allow_origins includes localhost:3000 and 127.0.0.1:3000 with allow_credentials=True.", 125),
            ("charlie", "Awesome. I'll test building a responsive layout on my end.", 120),
            ("alice", "Sounds good! The mobile drawer navigation collapses down neatly.", 110),
            ("charlie", "Talk to you later!", 100),
            ("alice", "Catch you later Charlie! 👍", 90),
        ]

        ac_msgs = []
        for sender_key, content, mins_ago in charlie_dialogue:
            sender = users[sender_key]
            recipient = users["charlie"] if sender_key == "alice" else users["alice"]
            msg_time = now - timedelta(minutes=mins_ago)
            msg = Message(
                conversation_id=conv_ac.id,
                sender_id=sender.id,
                content=content,
                message_type=MessageType.TEXT.value,
                created_at=msg_time,
                is_deleted=False
            )
            db.add(msg)
            db.flush()
            ac_msgs.append(msg)
            db.add(MessageStatus(
                message_id=msg.id,
                user_id=recipient.id,
                status=MessageDeliveryStatus.READ.value,
                updated_at=msg_time + timedelta(seconds=20)
            ))

        # Direct Conversation 3: Bob & Diana (16 messages)
        print("[Seed] Creating Direct Conversation: Bob & Diana...")
        conv_bd = Conversation(
            is_group=False,
            created_at=now - timedelta(days=1),
            created_by=users["bob"].id,
            disappearing_timer="off"
        )
        db.add(conv_bd)
        db.flush()

        db.add(ConversationMember(conversation_id=conv_bd.id, user_id=users["bob"].id, role=MemberRole.ADMIN.value, joined_at=now - timedelta(days=1)))
        db.add(ConversationMember(conversation_id=conv_bd.id, user_id=users["diana"].id, role=MemberRole.MEMBER.value, joined_at=now - timedelta(days=1)))
        db.flush()

        diana_dialogue = [
            ("diana", "Hi Bob! How does the Molten Onyx color scheme look to you?", 240),
            ("bob", "Hi Diana! It's gorgeous. The contrast between #0A0A0C and the primary accent #FF5A36 is striking.", 230),
            ("diana", "We made sure never to use default Tailwind grays anywhere.", 220),
            ("bob", "Yes, all cards, bubbles, and elevated panels use CSS variables strictly.", 210),
            ("diana", "Did you check the light mode tokens as well?", 200),
            ("bob", "Yep, --bg-base is #F6F4F1, --bg-surface is #EFEAE3, and the accents match perfectly.", 190),
            ("diana", "And all interactive elements have 200-300ms transitions.", 180),
            ("bob", "The buttons with rounded-full and cards with rounded-2xl feel genuinely native.", 170),
            ("diana", "Have you tried the keyboard shortcuts yet? Cmd/Ctrl+K opens search directly.", 160),
            ("bob", "Yes! Esc closes modals, Enter sends, Shift+Enter inserts a newline.", 150),
            ("diana", "We also have placeholder modals for Voice/Video calls, Stories, and Linked Devices.", 140),
            ("bob", "That covers all the Signal core experience expectations!", 130),
            ("diana", "Great. Let's make sure the group chat has an image sample.", 120),
            ("bob", "I'll post one in the Signal Core Devs channel.", 110),
            ("diana", "Thanks Bob!", 100),
            ("bob", "You got it! 🎯", 95),
        ]

        for sender_key, content, mins_ago in diana_dialogue:
            sender = users[sender_key]
            recipient = users["diana"] if sender_key == "bob" else users["bob"]
            msg_time = now - timedelta(minutes=mins_ago)
            msg = Message(
                conversation_id=conv_bd.id,
                sender_id=sender.id,
                content=content,
                message_type=MessageType.TEXT.value,
                created_at=msg_time,
                is_deleted=False
            )
            db.add(msg)
            db.flush()
            db.add(MessageStatus(
                message_id=msg.id,
                user_id=recipient.id,
                status=MessageDeliveryStatus.READ.value,
                updated_at=msg_time + timedelta(seconds=10)
            ))

        # Group Conversation: "Signal Core Devs" (5 members, 22+ messages, 1 image)
        print("[Seed] Creating Group Conversation: Signal Core Devs...")
        conv_grp = Conversation(
            is_group=True,
            name="Signal Core Devs",
            avatar_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
            created_at=now - timedelta(days=4),
            created_by=users["alice"].id,
            disappearing_timer="off"
        )
        db.add(conv_grp)
        db.flush()

        group_members = [
            ("alice", MemberRole.ADMIN.value),
            ("bob", MemberRole.MEMBER.value),
            ("charlie", MemberRole.MEMBER.value),
            ("diana", MemberRole.MEMBER.value),
            ("evan", MemberRole.MEMBER.value)
        ]

        for u_name, role in group_members:
            db.add(ConversationMember(
                conversation_id=conv_grp.id,
                user_id=users[u_name].id,
                role=role,
                joined_at=now - timedelta(days=4)
            ))
        db.flush()

        group_dialogue = [
            ("alice", "Welcome everyone to the Signal Core Devs channel! 🎉", 300, None, None),
            ("bob", "Great to be here! Excited to finalize the SignalClone build.", 290, None, None),
            ("charlie", "Hey team! All backend services and WebSockets are standing by.", 280, None, None),
            ("diana", "UI components and Molten Onyx design system are fully integrated.", 270, None, None),
            ("evan", "Just joined. Catching up on the conversation history.", 260, None, None),
            ("alice", "Evan, welcome! You can check your admin and member controls in the group info drawer.", 250, None, None),
            ("bob", "Here is a snapshot of our architecture diagram and UI mockup:", 240, MessageType.IMAGE.value, "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80"),
            ("charlie", "That dashboard looks very clean! Loving the dark theme contrast.", 230, None, None),
            ("diana", "Notice the small '🔒 End-to-end encrypted' badge pinned near the top of the chat.", 220, None, None),
            ("alice", "Yes, gives it that authentic Signal privacy assurance.", 210, None, None),
            ("evan", "Are delivery checkmarks supported for group messages too?", 200, None, None),
            ("bob", "Yes, delivery receipts track per-recipient statuses in the message_status table.", 190, None, None),
            ("charlie", "And when someone is typing, the animated indicator shows '[Name] is typing...'", 180, None, None),
            ("diana", "I've tested adding and toggling emoji reactions. It updates in real time via the socket.", 170, None, None),
            ("alice", "Let's do a quick checklist before final verification:", 160, None, None),
            ("alice", "1. Auth with mock OTP 123456 ✅", 150, None, None),
            ("bob", "2. Direct messaging with live updates ✅", 140, None, None),
            ("charlie", "3. Group creation with 2+ members and admin controls ✅", 130, None, None),
            ("diana", "4. Contact search by username & phone with 404/409 validation ✅", 120, None, None),
            ("evan", "5. Disappearing messages timer & responsive single-pane layout ✅", 110, None, None),
            ("alice", "Fantastic work team! All verification gates are ready to pass.", 60, None, None),
            ("bob", "Ready to ship! 🚀", 30, None, None)
        ]

        grp_msgs = []
        for sender_key, content, mins_ago, msg_type, attachment_url in group_dialogue:
            sender = users[sender_key]
            msg_time = now - timedelta(minutes=mins_ago)
            msg = Message(
                conversation_id=conv_grp.id,
                sender_id=sender.id,
                content=content,
                message_type=msg_type if msg_type else MessageType.TEXT.value,
                attachment_url=attachment_url,
                created_at=msg_time,
                is_deleted=False
            )
            db.add(msg)
            db.flush()
            grp_msgs.append(msg)

            # Add status for all other members
            for om_name, _ in group_members:
                if om_name != sender_key:
                    db.add(MessageStatus(
                        message_id=msg.id,
                        user_id=users[om_name].id,
                        status=MessageDeliveryStatus.READ.value if mins_ago > 35 else MessageDeliveryStatus.DELIVERED.value,
                        updated_at=msg_time + timedelta(seconds=30)
                    ))

        # Add reactions to group messages
        if len(grp_msgs) >= 7:
            db.add(Reaction(message_id=grp_msgs[0].id, user_id=users["bob"].id, emoji="🎉", created_at=now - timedelta(minutes=295)))
            db.add(Reaction(message_id=grp_msgs[0].id, user_id=users["diana"].id, emoji="❤️", created_at=now - timedelta(minutes=294)))
            db.add(Reaction(message_id=grp_msgs[6].id, user_id=users["charlie"].id, emoji="👍", created_at=now - timedelta(minutes=235)))
            db.add(Reaction(message_id=grp_msgs[6].id, user_id=users["alice"].id, emoji="🔥", created_at=now - timedelta(minutes=234)))
            db.add(Reaction(message_id=grp_msgs[-1].id, user_id=users["alice"].id, emoji="🚀", created_at=now - timedelta(minutes=25)))

        db.commit()
        print("\n========================================================")
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print(f"Users seeded: {len(users)}")
        print(f"Direct conversations seeded: 3 (Alice-Bob, Alice-Charlie, Bob-Diana)")
        print(f"Group conversations seeded: 1 ('Signal Core Devs' with 5 members, image, reactions)")
        print("========================================================\n")

    except Exception as e:
        db.rollback()
        print(f"[Seed Error] {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    seed_data(reset=reset_flag)
