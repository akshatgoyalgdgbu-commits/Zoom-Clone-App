export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface AllowedParticipant {
  id: number;
  meeting_id: number;
  name: string;
  email: string;
  phone?: string | null;
  has_joined: boolean;
  joined_at?: string | null;
}

export interface Meeting {
  id: number;
  meeting_code: string;
  title: string;
  description?: string | null;
  host_id: number;
  scheduled_start: string;
  duration_minutes: number;
  status: "scheduled" | "active" | "ended";
  is_restricted: boolean;
  invite_link: string;
  created_at: string;
  host_name?: string;
  has_password?: boolean;
  allowed_participants_count?: number;
  allowed_participants?: AllowedParticipant[];
}

export interface VerifyAccessResponse {
  allowed: boolean;
  join_type?: "host" | "verified" | "guest" | null;
  requires_password: boolean;
  display_name: string;
  error?: string | null;
  meeting_title?: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
}

export interface RoomParticipant {
  clientId: string;
  displayName: string;
  isHost: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream | null;
}

export interface UploadResult {
  participants: { name: string; email: string; phone?: string | null }[];
  total_parsed: number;
  duplicates_skipped: number;
  filename: string;
}
