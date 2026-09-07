"use client";

import React, { useState } from "react";
import {
  Users,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  UserX,
  Copy,
  Check,
  VolumeX,
} from "lucide-react";
import { RoomParticipant } from "@/types/meeting";
import { getInitials } from "@/lib/utils";

interface ParticipantsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  localParticipant: {
    displayName: string;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    isHost: boolean;
  };
  remoteParticipants: RoomParticipant[];
  meetingCode: string;
  handRaisedMap?: Record<string, boolean>;
  onHostMuteAll?: () => void;
  onHostMuteUser?: (clientId: string) => void;
  onHostRemoveUser?: (clientId: string) => void;
}

export default function ParticipantsPanel({
  isOpen,
  onClose,
  localParticipant,
  remoteParticipants,
  meetingCode,
  handRaisedMap = {},
  onHostMuteAll,
  onHostMuteUser,
  onHostRemoveUser,
}: ParticipantsPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalCount = 1 + remoteParticipants.length;

  const copyInviteLink = async () => {
    try {
      const url = `${window.location.origin}/join/${meetingCode}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <aside className="flex h-full w-80 sm:w-96 flex-col border-l border-zinc-800 bg-[#1f2024] shadow-2xl z-40 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Users className="h-4 w-4 text-[#2D8CFF]" />
          <span>Participants ({totalCount})</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          title="Close participants"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Local Participant (You) */}
        <div className="flex items-center justify-between rounded-xl p-2.5 transition hover:bg-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#2D8CFF] to-indigo-600 text-xs font-bold text-white">
              {getInitials(localParticipant.displayName)}
            </div>
            <div>
              <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                {localParticipant.displayName} (You)
                {localParticipant.isHost && (
                  <span className="rounded bg-[#2D8CFF]/80 px-1 py-0.5 text-[9px] font-bold text-white">
                    Host
                  </span>
                )}
                {handRaisedMap["local"] && (
                  <span title="Hand Raised">✋</span>
                )}
              </p>
              <p className="text-[11px] text-zinc-500">Local Stream</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-zinc-400">
            {localParticipant.isAudioMuted ? (
              <MicOff className="h-4 w-4 text-red-500" />
            ) : (
              <Mic className="h-4 w-4 text-emerald-400" />
            )}
            {localParticipant.isVideoMuted ? (
              <VideoOff className="h-4 w-4 text-red-500" />
            ) : (
              <Video className="h-4 w-4 text-zinc-300" />
            )}
          </div>
        </div>

        {/* Remote Participants */}
        {remoteParticipants.map((p) => (
          <div
            key={p.clientId}
            className="group flex items-center justify-between rounded-xl p-2.5 transition hover:bg-zinc-800/60"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200">
                {getInitials(p.displayName)}
              </div>
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  {p.displayName}
                  {p.isHost && (
                    <span className="rounded bg-[#2D8CFF]/80 px-1 py-0.5 text-[9px] font-bold text-white">
                      Host
                    </span>
                  )}
                  {handRaisedMap[p.clientId] && (
                    <span title="Hand Raised">✋</span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-500">Connected</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Host Actions for remote users */}
              {localParticipant.isHost && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {onHostMuteUser && !p.isAudioMuted && (
                    <button
                      onClick={() => onHostMuteUser(p.clientId)}
                      className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      title="Mute Participant"
                    >
                      <VolumeX className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onHostRemoveUser && (
                    <button
                      onClick={() => onHostRemoveUser(p.clientId)}
                      className="rounded-lg p-1 text-zinc-400 hover:bg-red-950/40 hover:text-red-400"
                      title="Remove from Meeting"
                    >
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Status Icons */}
              <div className="flex items-center gap-1.5 text-zinc-400">
                {p.isAudioMuted ? (
                  <MicOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Mic className="h-4 w-4 text-emerald-400" />
                )}
                {p.isVideoMuted ? (
                  <VideoOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Video className="h-4 w-4 text-zinc-300" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Host Controls */}
      <div className="border-t border-zinc-800 p-3 bg-[#18191c] space-y-2">
        {localParticipant.isHost && onHostMuteAll && (
          <button
            onClick={onHostMuteAll}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 py-2 px-4 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 active:scale-98"
          >
            <VolumeX className="h-3.5 w-3.5 text-red-400" />
            Mute All Participants
          </button>
        )}

        <button
          onClick={copyInviteLink}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D8CFF] py-2 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0E71EB] active:scale-98"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Invitation Link Copied!" : "Invite / Copy Link"}
        </button>
      </div>
    </aside>
  );
}
