"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { VerifyAccessResponse } from "@/types/meeting";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Loader2,
  Users,
  Lock,
  ArrowRight,
  Shield,
  CheckCircle,
} from "lucide-react";

export default function JoinPage() {
  const router = useRouter();
  const { user, isAuthenticated, guestLogin } = useAuth();

  const [meetingCode, setMeetingCode] = useState("");
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");

  // Media preview states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && !displayName) {
      setDisplayName(user.name);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);

  // Setup preview camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        activeStream = s;
        setStream(s);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.warn("Could not start preview camera:", err);
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleAudio = () => {
    if (stream) {
      const next = !isAudioMuted;
      stream.getAudioTracks().forEach((t) => (t.enabled = !next));
      setIsAudioMuted(next);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const next = !isVideoMuted;
      stream.getVideoTracks().forEach((t) => (t.enabled = !next));
      setIsVideoMuted(next);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanCode = meetingCode.replace(/\D/g, "");
    if (!cleanCode) {
      setError("Please enter a valid meeting ID.");
      return;
    }

    setIsVerifying(true);
    try {
      if (!isAuthenticated) {
        await guestLogin();
      }

      // Verify access with backend
      const res = await api.post<VerifyAccessResponse>(
        `/api/meetings/${cleanCode}/verify-access`,
        {
          name: displayName.trim() || "Guest Participant",
          email: email.trim() || null,
          password: password.trim() || null,
        }
      );

      if (!res.allowed) {
        setError(res.error || "Access denied. Please check your credentials or passcode.");
        return;
      }

      // Stop preview stream before entering meeting room
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      // Navigate to meeting room with verified flag
      const searchParams = new URLSearchParams({
        name: res.display_name || displayName.trim() || "Participant",
        mic: isAudioMuted ? "muted" : "active",
        cam: isVideoMuted ? "off" : "on",
        verified: "true",
      });

      router.push(`/meeting/${cleanCode}?${searchParams.toString()}`);
    } catch (err: any) {
      setError(err.message || "Failed to join meeting. Please verify meeting ID.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="grid w-full max-w-4xl grid-cols-1 md:grid-cols-2 gap-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-2xl">
        {/* Left Column: Camera Preview */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-inner flex items-center justify-center">
            {stream && !isVideoMuted ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500">
                <VideoOff className="h-12 w-12 mb-2" />
                <p className="text-xs">Camera is off</p>
              </div>
            )}

            {/* Quick Preview Toggle Controls */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 backdrop-blur-md">
              <button
                type="button"
                onClick={toggleAudio}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  isAudioMuted ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  isVideoMuted ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
              >
                {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
            Preview your audio and video before entering the room
          </p>
        </div>

        {/* Right Column: Join Form */}
        <div className="flex flex-col justify-center space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Join Meeting
            </h1>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Enter the meeting ID or personal link name
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Meeting ID or Personal Link *
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-3 h-4 w-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  required
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  placeholder="e.g. 123 456 7890"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Your Display Name *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Email Address (Required for Restricted Meetings)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Passcode (If Meeting is Protected)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[var(--text-secondary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passcode if required"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D8CFF] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0E71EB] disabled:opacity-50 cursor-pointer"
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isVerifying ? "Verifying Access..." : "Join"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
