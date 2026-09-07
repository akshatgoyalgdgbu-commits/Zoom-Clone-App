"use client";

import React, { useState } from "react";
import VideoTile from "./VideoTile";
import { RoomParticipant } from "@/types/meeting";
import { MonitorUp, MonitorX } from "lucide-react";

interface VideoGridProps {
  localParticipant: {
    displayName: string;
    stream: MediaStream | null;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    isHost: boolean;
    isScreenSharing?: boolean;
    screenStream?: MediaStream | null;
  };
  remoteParticipants: RoomParticipant[];
  reactions?: Record<string, { emoji: string; id: number }>;
  handRaisedMap?: Record<string, boolean>;
  onStopScreenShare?: () => void;
}

export default function VideoGrid({
  localParticipant,
  remoteParticipants,
  reactions = {},
  handRaisedMap = {},
  onStopScreenShare,
}: VideoGridProps) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // Check if someone is sharing screen
  const isLocalSharing = !!(localParticipant.isScreenSharing && localParticipant.screenStream);
  const remoteSharer = remoteParticipants.find(
    (p) => p.isScreenSharing && p.stream && p.stream.getVideoTracks().length > 0
  );

  // If screen sharing is active
  if (isLocalSharing || remoteSharer) {
    const activeShareStream = isLocalSharing
      ? localParticipant.screenStream
      : remoteSharer?.stream;
    const sharerName = isLocalSharing
      ? "You"
      : remoteSharer?.displayName || "Participant";

    return (
      <div className="flex h-full w-full flex-col lg:flex-row gap-3 p-3 bg-zinc-950">
        {/* Main Screen Share Spotlight */}
        <div className="relative flex-1 h-full min-h-[300px] overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          {/* Top Banner indicating who is sharing */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 rounded-full bg-black/70 px-3.5 py-1.5 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
            <MonitorUp className="h-4 w-4 text-emerald-400" />
            <span>{isLocalSharing ? "You are sharing your screen" : `${sharerName} is sharing screen`}</span>
            {isLocalSharing && onStopScreenShare && (
              <button
                onClick={onStopScreenShare}
                className="ml-2 flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-red-700 transition"
              >
                <MonitorX className="h-3 w-3" /> Stop Sharing
              </button>
            )}
          </div>

          <VideoTile
            displayName={`${sharerName}'s Screen`}
            stream={activeShareStream || null}
            isAudioMuted={false}
            isVideoMuted={false}
            isScreenShare={true}
            isLocal={isLocalSharing}
          />
        </div>

        {/* Thumbnail Filmstrip on side/bottom */}
        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-72 max-h-[200px] lg:max-h-full pb-2 lg:pb-0 shrink-0">
          {/* Local participant thumbnail */}
          <div className="h-36 w-52 lg:w-full flex-shrink-0">
            <VideoTile
              displayName={localParticipant.displayName}
              stream={localParticipant.stream}
              isAudioMuted={localParticipant.isAudioMuted}
              isVideoMuted={localParticipant.isVideoMuted}
              isHost={localParticipant.isHost}
              isLocal={true}
              reaction={reactions["local"]}
              isHandRaised={!!handRaisedMap["local"]}
            />
          </div>

          {/* Remote participants thumbnails */}
          {remoteParticipants.map((p) => (
            <div key={p.clientId} className="h-36 w-52 lg:w-full flex-shrink-0">
              <VideoTile
                displayName={p.displayName}
                stream={p.stream || null}
                isAudioMuted={p.isAudioMuted}
                isVideoMuted={p.isVideoMuted}
                isHost={p.isHost}
                reaction={reactions[p.clientId]}
                isHandRaised={!!handRaisedMap[p.clientId]}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Gallery View - Calculate Grid Layout
  const totalCount = 1 + remoteParticipants.length;

  const getGridClass = () => {
    if (totalCount === 1) return "grid-cols-1";
    if (totalCount === 2) return "grid-cols-1 md:grid-cols-2";
    if (totalCount <= 4) return "grid-cols-1 sm:grid-cols-2";
    if (totalCount <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="h-full w-full p-3 bg-zinc-950 overflow-hidden flex items-center justify-center">
      <div
        className={`grid h-full w-full gap-3 transition-all duration-300 ${getGridClass()}`}
      >
        {/* Local Participant Tile */}
        <div className="h-full w-full min-h-[180px]">
          <VideoTile
            displayName={localParticipant.displayName}
            stream={localParticipant.stream}
            isAudioMuted={localParticipant.isAudioMuted}
            isVideoMuted={localParticipant.isVideoMuted}
            isHost={localParticipant.isHost}
            isLocal={true}
            reaction={reactions["local"]}
            isHandRaised={!!handRaisedMap["local"]}
            isPinned={pinnedId === "local"}
            onPinToggle={() => setPinnedId(pinnedId === "local" ? null : "local")}
          />
        </div>

        {/* Remote Participants Tiles */}
        {remoteParticipants.map((p) => (
          <div key={p.clientId} className="h-full w-full min-h-[180px]">
            <VideoTile
              displayName={p.displayName}
              stream={p.stream || null}
              isAudioMuted={p.isAudioMuted}
              isVideoMuted={p.isVideoMuted}
              isHost={p.isHost}
              reaction={reactions[p.clientId]}
              isHandRaised={!!handRaisedMap[p.clientId]}
              isPinned={pinnedId === p.clientId}
              onPinToggle={() => setPinnedId(pinnedId === p.clientId ? null : p.clientId)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
