"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  Users,
  MessageSquare,
  MonitorUp,
  Smile,
  Disc,
  PhoneOff,
  Hand,
} from "lucide-react";

interface InMeetingToolbarProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  participantCount: number;
  unreadChatCount: number;
  isHandRaised: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onSendReaction: (emoji: string) => void;
  onToggleHandRaise: () => void;
  onOpenLeaveModal: () => void;
}

const REACTION_EMOJIS = ["👏", "👍", "❤️", "😂", "😮", "🎉"];

export default function InMeetingToolbar({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  isRecording,
  isChatOpen,
  isParticipantsOpen,
  participantCount,
  unreadChatCount,
  isHandRaised,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onToggleChat,
  onToggleParticipants,
  onSendReaction,
  onToggleHandRaise,
  onOpenLeaveModal,
}: InMeetingToolbarProps) {
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [showSecurityMenu, setShowSecurityMenu] = useState(false);
  const reactionsMenuRef = useRef<HTMLDivElement>(null);
  const securityMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        reactionsMenuRef.current &&
        !reactionsMenuRef.current.contains(e.target as Node)
      ) {
        setShowReactionsMenu(false);
      }
      if (
        securityMenuRef.current &&
        !securityMenuRef.current.contains(e.target as Node)
      ) {
        setShowSecurityMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <footer className="relative flex h-20 w-full items-center justify-between border-t border-zinc-800 bg-[#1a1b1e] px-4 sm:px-6 select-none z-30">
      {/* Left section: Audio & Video controls */}
      <div className="flex items-center gap-2">
        {/* Audio Toggle */}
        <button
          onClick={onToggleAudio}
          className={`flex flex-col items-center justify-center rounded-xl p-2 transition cursor-pointer ${
            isAudioMuted
              ? "text-red-500 hover:bg-red-500/10"
              : "text-zinc-200 hover:bg-zinc-800 hover:text-white"
          }`}
          title={isAudioMuted ? "Unmute Audio (Alt+A)" : "Mute Audio (Alt+A)"}
        >
          {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          <span className="mt-1 text-[11px] font-medium">
            {isAudioMuted ? "Unmute" : "Mute"}
          </span>
        </button>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          className={`flex flex-col items-center justify-center rounded-xl p-2 transition cursor-pointer ${
            isVideoMuted
              ? "text-red-500 hover:bg-red-500/10"
              : "text-zinc-200 hover:bg-zinc-800 hover:text-white"
          }`}
          title={isVideoMuted ? "Start Video (Alt+V)" : "Stop Video (Alt+V)"}
        >
          {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          <span className="mt-1 text-[11px] font-medium">
            {isVideoMuted ? "Start Video" : "Stop Video"}
          </span>
        </button>
      </div>

      {/* Middle section: Security, Participants, Chat, Share, Record, Reactions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Security / Info */}
        <div className="relative" ref={securityMenuRef}>
          <button
            onClick={() => setShowSecurityMenu(!showSecurityMenu)}
            className="flex flex-col items-center justify-center rounded-xl p-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-white cursor-pointer"
            title="Security Info"
          >
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="mt-1 text-[11px] font-medium">Security</span>
          </button>

          {showSecurityMenu && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl text-xs text-zinc-300 z-50">
              <p className="font-semibold text-white mb-2 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-400" />
                End-to-End Encrypted
              </p>
              <ul className="space-y-1 text-zinc-400 text-[11px]">
                <li>• Peer-to-peer WebRTC mesh</li>
                <li>• Real-time WebSocket signaling</li>
                <li>• TLS/WSS encryption</li>
              </ul>
            </div>
          )}
        </div>

        {/* Participants */}
        <button
          onClick={onToggleParticipants}
          className={`relative flex flex-col items-center justify-center rounded-xl p-2 transition cursor-pointer ${
            isParticipantsOpen
              ? "bg-zinc-800 text-[#2D8CFF]"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
          title="Participants"
        >
          <div className="relative">
            <Users className="h-5 w-5" />
            <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2D8CFF] px-1 text-[9px] font-bold text-white">
              {participantCount}
            </span>
          </div>
          <span className="mt-1 text-[11px] font-medium">Participants</span>
        </button>

        {/* Chat */}
        <button
          onClick={onToggleChat}
          className={`relative flex flex-col items-center justify-center rounded-xl p-2 transition cursor-pointer ${
            isChatOpen
              ? "bg-zinc-800 text-[#2D8CFF]"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
          title="Chat"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="mt-1 text-[11px] font-medium">Chat</span>
        </button>

        {/* Share Screen */}
        <button
          onClick={onToggleScreenShare}
          className={`flex flex-col items-center justify-center rounded-xl p-2 transition cursor-pointer ${
            isScreenSharing
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          }`}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          <MonitorUp className="h-5 w-5" />
          <span className="mt-1 text-[11px] font-medium">
            {isScreenSharing ? "Stop Share" : "Share Screen"}
          </span>
        </button>

        {/* Record (Functional in-browser recording) */}
        <button
          onClick={onToggleRecording}
          className={`flex flex-col items-center justify-center rounded-xl p-2 transition cursor-pointer ${
            isRecording
              ? "text-red-500 hover:bg-red-500/10"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
          title={isRecording ? "Stop Recording & Download" : "Record Meeting"}
        >
          <div className="relative">
            <Disc className={`h-5 w-5 ${isRecording ? "animate-spin text-red-500" : ""}`} />
            {isRecording && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
          <span className="mt-1 text-[11px] font-medium">
            {isRecording ? "Recording" : "Record"}
          </span>
        </button>

        {/* Reactions Popup Menu */}
        <div className="relative" ref={reactionsMenuRef}>
          <button
            onClick={() => setShowReactionsMenu(!showReactionsMenu)}
            className={`flex flex-col items-center justify-center rounded-xl p-2 transition cursor-pointer ${
              showReactionsMenu || isHandRaised
                ? "bg-zinc-800 text-amber-400"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
            title="Reactions & Hand Raise"
          >
            {isHandRaised ? <Hand className="h-5 w-5 text-amber-400" /> : <Smile className="h-5 w-5" />}
            <span className="mt-1 text-[11px] font-medium">Reactions</span>
          </button>

          {showReactionsMenu && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-semibold text-zinc-400 mb-2 px-1">Send a Reaction</p>
              <div className="flex items-center justify-between gap-1 pb-3 border-b border-zinc-800">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSendReaction(emoji);
                      setShowReactionsMenu(false);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xl hover:bg-zinc-800 hover:scale-125 transition transform active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Hand Raise Toggle */}
              <button
                onClick={() => {
                  onToggleHandRaise();
                  setShowReactionsMenu(false);
                }}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                  isHandRaised
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                <Hand className="h-4 w-4" />
                {isHandRaised ? "Lower Hand" : "Raise Hand"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right section: End / Leave button */}
      <div className="flex items-center">
        <button
          onClick={onOpenLeaveModal}
          className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-red-700 active:scale-95 cursor-pointer"
        >
          <PhoneOff className="h-4 w-4" />
          <span>End</span>
        </button>
      </div>
    </footer>
  );
}
