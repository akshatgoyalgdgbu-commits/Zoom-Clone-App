"use client";

import React, { useEffect, useRef } from "react";
import { Mic, MicOff, Shield, Pin, MonitorUp } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface VideoTileProps {
  displayName: string;
  stream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isHost?: boolean;
  isLocal?: boolean;
  isScreenShare?: boolean;
  reaction?: { emoji: string; id: number } | null;
  isHandRaised?: boolean;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

export default function VideoTile({
  displayName,
  stream,
  isAudioMuted,
  isVideoMuted,
  isHost = false,
  isLocal = false,
  isScreenShare = false,
  reaction = null,
  isHandRaised = false,
  isPinned = false,
  onPinToggle,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
  }, [stream, isScreenShare, isVideoMuted]);

  const hasVideoStream = stream && stream.getVideoTracks().length > 0 && !isVideoMuted;

  return (
    <div
      className={`group relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 shadow-md transition-all ${
        isPinned ? "ring-2 ring-[#2D8CFF]" : "border border-zinc-800"
      }`}
    >
      {/* Video Element */}
      {hasVideoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isScreenShare} // Always mute local video/screen to prevent audio feedback loop
          className={`h-full w-full ${
            isScreenShare
              ? "object-contain bg-black"
              : `object-cover ${isLocal ? "scale-x-[-1]" : ""}`
          }`}
        />
      ) : (
        /* Avatar Fallback */
        <div className="flex flex-col items-center justify-center gap-3 select-none">
          <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-gradient-to-tr from-[#2D8CFF] to-indigo-600 text-2xl sm:text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
            {getInitials(displayName)}
          </div>
          <p className="text-sm font-medium text-zinc-300">
            {displayName} {isLocal && "(You)"}
          </p>
        </div>
      )}

      {/* Floating Reaction Animation */}
      {reaction && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="animate-bounce text-6xl drop-shadow-lg filter">
            {reaction.emoji}
          </div>
        </div>
      )}

      {/* Hand Raised Badge (Top Left) */}
      {isHandRaised && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md animate-pulse">
          <span>✋</span>
          <span>Hand Raised</span>
        </div>
      )}

      {/* Screen Share Badge */}
      {isScreenShare && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-[#2D8CFF]/90 px-2.5 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-md">
          <MonitorUp className="h-3.5 w-3.5" />
          <span>Screen Share</span>
        </div>
      )}

      {/* Pin button on hover */}
      {onPinToggle && (
        <button
          onClick={onPinToggle}
          className={`absolute top-3 right-3 z-10 rounded-full p-2 text-white/80 backdrop-blur-md transition hover:bg-black/60 hover:text-white ${
            isPinned ? "bg-[#2D8CFF] text-white opacity-100" : "bg-black/40 opacity-0 group-hover:opacity-100"
          }`}
          title={isPinned ? "Unpin video" : "Pin video"}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bottom Information Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 backdrop-blur-md border border-white/10">
          {isAudioMuted ? (
            <MicOff className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Mic className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span className="text-xs font-medium text-white line-clamp-1 max-w-[140px] sm:max-w-[200px]">
            {displayName} {isLocal && "(You)"}
          </span>
          {isHost && (
            <span className="flex items-center gap-0.5 rounded bg-[#2D8CFF]/80 px-1 py-0.5 text-[10px] font-semibold text-white">
              <Shield className="h-2.5 w-2.5" /> Host
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
