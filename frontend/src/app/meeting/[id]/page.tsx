"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useMeetingRoom } from "@/hooks/useMeetingRoom";
import { api } from "@/lib/api";
import { Meeting, VerifyAccessResponse } from "@/types/meeting";
import VideoGrid from "@/components/meeting/VideoGrid";
import InMeetingToolbar from "@/components/meeting/InMeetingToolbar";
import ChatPanel from "@/components/meeting/ChatPanel";
import ParticipantsPanel from "@/components/meeting/ParticipantsPanel";
import EndMeetingModal from "@/components/meeting/EndMeetingModal";
import {
  Shield,
  Copy,
  Check,
  Info,
  AlertCircle,
  Loader2,
  Lock,
  User,
  Mail,
  ArrowRight,
} from "lucide-react";
import { formatMeetingCode } from "@/lib/utils";

export default function MeetingRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawCode = (params?.id as string) || "";
  const meetingCode = rawCode.replace(/\D/g, "");

  const { user, isAuthenticated, isLoading: authLoading, guestLogin } = useAuth();

  // Query parameter configurations
  const queryName = searchParams.get("name");
  const queryMicMuted = searchParams.get("mic") === "muted";
  const queryCamOff = searchParams.get("cam") === "off";
  const isPreVerified = searchParams.get("verified") === "true";

  const [displayName, setDisplayName] = useState(
    queryName || user?.name || ""
  );
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [meetingNotFound, setMeetingNotFound] = useState(false);

  // Authentication & Verification state
  const [isAccessAllowed, setIsAccessAllowed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Verification modal inputs
  const [modalName, setModalName] = useState(queryName || user?.name || "");
  const [modalEmail, setModalEmail] = useState(user?.email || "");
  const [modalPassword, setModalPassword] = useState("");

  // Host state
  const [isHost, setIsHost] = useState(false);

  // UI Panels
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Disconnect / Kicked banners
  const [kickedReason, setKickedReason] = useState<string | null>(null);
  const [meetingEndedReason, setMeetingEndedReason] = useState<string | null>(null);

  // Client ID for WebRTC/WebSocket
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "client-" + Math.random();
    let saved = sessionStorage.getItem("zoom_client_id");
    if (!saved) {
      saved = `client_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      sessionStorage.setItem("zoom_client_id", saved);
    }
    return saved;
  }, []);

  // 1. Fetch meeting info
  useEffect(() => {
    async function loadMeeting() {
      if (!meetingCode) return;
      try {
        setIsLoadingMeeting(true);
        const data = await api.get<Meeting>(`/api/meetings/${meetingCode}`);
        setMeeting(data);
      } catch (err: any) {
        console.warn("Meeting load error:", err);
        setMeetingNotFound(true);
      } finally {
        setIsLoadingMeeting(false);
      }
    }
    loadMeeting();
  }, [meetingCode]);

  // 2. Determine host status and verify entry requirements
  useEffect(() => {
    if (authLoading || isLoadingMeeting || !meeting) return;

    // Check if current user is host
    const userIsHost = !!(user && meeting.host_id === user.id);
    setIsHost(userIsHost);

    if (userIsHost) {
      // Host always has direct access
      setIsAccessAllowed(true);
      if (!displayName) {
        setDisplayName(user.name);
      }
      return;
    }

    if (isPreVerified) {
      setIsAccessAllowed(true);
      return;
    }

    if (!meeting.is_restricted && !meeting.has_password) {
      // Open meeting with no restrictions
      setIsAccessAllowed(true);
      if (!displayName) {
        setDisplayName(user?.name || "Participant");
      }
    } else {
      // Meeting is restricted or has password -> prompt verification modal
      setIsAccessAllowed(false);
    }
  }, [meeting, user, authLoading, isLoadingMeeting, isPreVerified, displayName]);

  // Handle in-place verification submission
  const handleVerifyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsVerifying(true);

    try {
      if (!isAuthenticated && !user) {
        await guestLogin();
      }

      const res = await api.post<VerifyAccessResponse>(
        `/api/meetings/${meetingCode}/verify-access`,
        {
          name: modalName.trim() || "Guest Participant",
          email: modalEmail.trim() || null,
          password: modalPassword.trim() || null,
        }
      );

      if (!res.allowed) {
        setAuthError(res.error || "Access denied. Please check your credentials or passcode.");
        return;
      }

      setDisplayName(res.display_name || modalName.trim() || "Participant");
      setIsAccessAllowed(true);
    } catch (err: any) {
      setAuthError(err.message || "Failed to verify meeting access.");
    } finally {
      setIsVerifying(false);
    }
  };

  // 3. Connect to WebRTC & WebSocket room (only once access is allowed)
  const roomHook = useMeetingRoom({
    meetingCode: isAccessAllowed ? meetingCode : "",
    clientId,
    displayName: displayName || "Participant",
    isHost,
    initialAudioMuted: queryMicMuted,
    initialVideoMuted: queryCamOff,
    onKicked: (reason) => setKickedReason(reason),
    onMeetingEnded: (reason) => setMeetingEndedReason(reason),
  });

  const {
    localStream,
    isAudioMuted,
    isVideoMuted,
    screenStream,
    isScreenSharing,
    isRecording,
    remoteParticipants,
    messages,
    reactions,
    handRaisedMap,
    isConnected,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    stopScreenShare,
    toggleRecording,
    sendReaction,
    toggleHandRaise,
    sendMessage,
    hostMuteAll,
    hostMuteUser,
    hostRemoveUser,
    endMeetingForAll,
  } = roomHook;

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/join/${meetingCode}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleLeaveMeeting = () => {
    stopScreenShare();
    router.push("/");
  };

  const handleEndMeetingForAll = () => {
    stopScreenShare();
    endMeetingForAll();
    router.push("/");
  };

  // If meeting not found
  if (meetingNotFound) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold">Meeting Not Found</h2>
          <p className="mt-2 text-xs text-zinc-400">
            The meeting ID <span className="font-mono text-white">{formatMeetingCode(meetingCode)}</span> does not exist or has expired.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[#2D8CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E71EB]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingMeeting || authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#2D8CFF]" />
          <p className="text-xs text-zinc-400">Connecting to Zoom Meeting...</p>
        </div>
      </div>
    );
  }

  // Kicked screen
  if (kickedReason) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-zinc-900 p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold">Removed from Meeting</h2>
          <p className="mt-2 text-xs text-zinc-400">{kickedReason}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[#2D8CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E71EB]"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Meeting ended screen
  if (meetingEndedReason) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
          <Info className="mx-auto h-12 w-12 text-[#2D8CFF] mb-4" />
          <h2 className="text-xl font-bold">Meeting Ended</h2>
          <p className="mt-2 text-xs text-zinc-400">{meetingEndedReason}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[#2D8CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E71EB]"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Authentication Gate Modal for Restricted Meetings
  if (!isAccessAllowed) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4 text-white select-none">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mb-3 border border-purple-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Restricted Meeting Access</h2>
            <p className="mt-1 text-xs text-zinc-400">
              {meeting?.title} (ID: {formatMeetingCode(meetingCode)})
            </p>
          </div>

          {authError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {authError}
            </div>
          )}

          <form onSubmit={handleVerifyAccess} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Your Display Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                />
              </div>
            </div>

            {meeting?.is_restricted && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Invited Email (Allow-List)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                  />
                </div>
              </div>
            )}

            {meeting?.has_password && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Meeting Passcode
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    placeholder="Enter meeting passcode"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !modalName.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-[#2D8CFF] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0E71EB] disabled:opacity-50 transition cursor-pointer"
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Join Meeting
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Active Meeting Room Screen
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-white select-none">
      {/* Top Meeting Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-[#16171a] px-4 sm:px-6 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Encrypted</span>
          </div>

          <h2 className="text-sm font-bold text-zinc-100 line-clamp-1 max-w-[200px] sm:max-w-xs">
            {meeting?.title || "Zoom Meeting"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Meeting ID pill with copy button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/60 px-3 py-1 text-xs font-mono font-medium text-zinc-300 hover:bg-zinc-700/80 hover:text-white transition cursor-pointer"
            title="Copy Invite Link"
          >
            <span>{formatMeetingCode(meetingCode)}</span>
            {copiedLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area: Video Grid + Side Panels */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Video Grid */}
        <main className="flex-1 h-full overflow-hidden">
          <VideoGrid
            localParticipant={{
              displayName,
              stream: localStream,
              isAudioMuted,
              isVideoMuted,
              isHost,
              isScreenSharing,
              screenStream,
            }}
            remoteParticipants={remoteParticipants}
            reactions={reactions}
            handRaisedMap={handRaisedMap}
            onStopScreenShare={stopScreenShare}
          />
        </main>

        {/* In-Meeting Chat Drawer */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
          onSendMessage={sendMessage}
          currentClientId={clientId}
        />

        {/* Participants Drawer */}
        <ParticipantsPanel
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          localParticipant={{
            displayName,
            isAudioMuted,
            isVideoMuted,
            isHost,
          }}
          remoteParticipants={remoteParticipants}
          meetingCode={meetingCode}
          handRaisedMap={handRaisedMap}
          onHostMuteAll={isHost ? hostMuteAll : undefined}
          onHostMuteUser={isHost ? hostMuteUser : undefined}
          onHostRemoveUser={isHost ? hostRemoveUser : undefined}
        />
      </div>

      {/* Bottom Toolbar */}
      <InMeetingToolbar
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        participantCount={1 + remoteParticipants.length}
        unreadChatCount={0}
        isHandRaised={!!handRaisedMap["local"]}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleChat={() => {
          setIsChatOpen(!isChatOpen);
          if (isParticipantsOpen) setIsParticipantsOpen(false);
        }}
        onToggleParticipants={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          if (isChatOpen) setIsChatOpen(false);
        }}
        onSendReaction={sendReaction}
        onToggleHandRaise={toggleHandRaise}
        onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
      />

      {/* Leave / End Meeting Modal */}
      <EndMeetingModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        isHost={isHost}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeetingForAll={isHost ? handleEndMeetingForAll : undefined}
      />
    </div>
  );
}
