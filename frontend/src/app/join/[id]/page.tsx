"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Meeting, VerifyAccessResponse } from "@/types/meeting";
import {
  Video,
  Loader2,
  Users,
  Lock,
  ArrowRight,
  Shield,
  Clock,
  Calendar,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function JoinByIdPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || "";
  const cleanCode = rawId.replace(/\D/g, "");

  const { user, isAuthenticated, guestLogin } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && !displayName) {
      setDisplayName(user.name);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    async function fetchMeetingDetails() {
      try {
        setIsLoadingMeeting(true);
        const res = await api.get<Meeting>(`/api/meetings/${cleanCode}`);
        setMeeting(res);
      } catch (err: any) {
        console.warn("Could not fetch meeting info beforehand:", err);
      } finally {
        setIsLoadingMeeting(false);
      }
    }
    if (cleanCode) {
      fetchMeetingDetails();
    }
  }, [cleanCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsJoining(true);

    try {
      if (!isAuthenticated) {
        await guestLogin();
      }

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

      const searchParams = new URLSearchParams({
        name: res.display_name || displayName.trim() || "Participant",
        verified: "true",
      });

      router.push(`/meeting/${cleanCode}?${searchParams.toString()}`);
    } catch (err: any) {
      setError(err.message || "Failed to join meeting.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2D8CFF] text-white shadow-md mb-3">
            <Video className="h-6 w-6 fill-current" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Join Zoom Meeting
          </h1>
          <p className="mt-1 font-mono text-xs font-semibold text-[#2D8CFF]">
            Meeting ID: {cleanCode}
          </p>
        </div>

        {/* Meeting metadata card if found */}
        {meeting && (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] line-clamp-1">
                {meeting.title}
              </span>
              {meeting.is_restricted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600">
                  <Shield className="h-3 w-3" />
                  Allow-list
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Calendar className="h-3.5 w-3.5 text-[#2D8CFF]" />
              <span>{formatDateTime(meeting.scheduled_start)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
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
              Email Address
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
              Passcode (If Required)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passcode"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D8CFF] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0E71EB] disabled:opacity-50 cursor-pointer"
          >
            {isJoining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isJoining ? "Entering Room..." : "Join Meeting"}
          </button>
        </form>
      </div>
    </div>
  );
}
