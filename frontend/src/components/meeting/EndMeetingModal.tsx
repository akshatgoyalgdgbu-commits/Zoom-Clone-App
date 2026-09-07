"use client";

import React from "react";
import { PhoneOff, LogOut, X } from "lucide-react";

interface EndMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  onLeaveMeeting: () => void;
  onEndMeetingForAll?: () => void;
}

export default function EndMeetingModal({
  isOpen,
  onClose,
  isHost,
  onLeaveMeeting,
  onEndMeetingForAll,
}: EndMeetingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-4">
          <PhoneOff className="h-6 w-6" />
        </div>

        <h3 className="text-lg font-bold text-white">
          {isHost ? "End or Leave Meeting?" : "Leave Meeting?"}
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          {isHost
            ? "As the host, you can end this meeting for everyone or leave it running."
            : "Are you sure you want to leave this meeting?"}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {isHost && onEndMeetingForAll && (
            <button
              onClick={onEndMeetingForAll}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-red-700 active:scale-98 cursor-pointer"
            >
              <PhoneOff className="h-4 w-4" />
              End Meeting for All
            </button>
          )}

          <button
            onClick={onLeaveMeeting}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition active:scale-98 cursor-pointer ${
              isHost
                ? "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                : "bg-red-600 text-white hover:bg-red-700 shadow-md"
            }`}
          >
            <LogOut className="h-4 w-4" />
            Leave Meeting
          </button>

          <button
            onClick={onClose}
            className="mt-1 rounded-xl py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
