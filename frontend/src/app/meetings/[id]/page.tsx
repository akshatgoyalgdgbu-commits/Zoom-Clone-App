"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Meeting } from "@/types/meeting";
import { formatDateTime, formatMeetingCode } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Video,
  Copy,
  Check,
  Shield,
  Users,
  Lock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function MeetingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const rawId = (params?.id as string) || "";
  const meetingCode = rawId.replace(/\D/g, "");

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        setIsLoading(true);
        const data = await api.get<Meeting>(`/api/meetings/${meetingCode}`);
        setMeeting(data);
      } catch (err: any) {
        setError(err.message || "Failed to load meeting details.");
      } finally {
        setIsLoading(false);
      }
    }
    if (meetingCode) {
      fetchDetails();
    }
  }, [meetingCode]);

  const copyInvite = async () => {
    try {
      const url = `${window.location.origin}/join/${meetingCode}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2D8CFF]" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-red-500">Meeting Not Found</h2>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">{error || "Could not find meeting details."}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#2D8CFF] px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Dashboard
        </Link>
      </div>
    );
  }

  const isHost = user?.id === meeting.host_id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[#2D8CFF] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Meetings
        </Link>
      </div>

      {/* Main Details Card */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-600">
                {meeting.status}
              </span>
              {meeting.is_restricted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600">
                  <Shield className="h-3 w-3" />
                  Restricted Allow-list
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {meeting.title}
            </h1>
            {meeting.description && (
              <p className="text-xs text-[var(--text-secondary)] max-w-xl">
                {meeting.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyInvite}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[#2D8CFF] transition cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link Copied!" : "Copy Invite Link"}
            </button>

            <Link
              href={`/meeting/${meeting.meeting_code}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2D8CFF] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0E71EB] transition"
            >
              <Video className="h-4 w-4" />
              {isHost ? "Start Meeting" : "Join Meeting"}
            </Link>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Calendar className="h-4 w-4 text-[#2D8CFF]" />
              <span>Scheduled Time</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              {formatDateTime(meeting.scheduled_start)}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Clock className="h-4 w-4 text-[#2D8CFF]" />
              <span>Duration</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              {meeting.duration_minutes} minutes
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Users className="h-4 w-4 text-[#2D8CFF]" />
              <span>Meeting ID</span>
            </div>
            <p className="mt-2 font-mono text-sm font-bold text-[var(--text-primary)]">
              {formatMeetingCode(meeting.meeting_code)}
            </p>
          </div>
        </div>

        {/* Allowed Participants Table (If Restricted) */}
        {meeting.allowed_participants && meeting.allowed_participants.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                Invited & Allowed Attendees ({meeting.allowed_participants.length})
              </h3>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-card-subtle)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Attendee Name</th>
                    <th className="py-2.5 px-4 font-semibold">Email</th>
                    <th className="py-2.5 px-4 font-semibold">Phone</th>
                    <th className="py-2.5 px-4 font-semibold">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {meeting.allowed_participants.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--bg-card-subtle)]/50 transition">
                      <td className="py-2.5 px-4 font-medium text-[var(--text-primary)]">{p.name}</td>
                      <td className="py-2.5 px-4 text-[var(--text-secondary)]">{p.email}</td>
                      <td className="py-2.5 px-4 text-[var(--text-secondary)]">{p.phone || "—"}</td>
                      <td className="py-2.5 px-4">
                        {p.has_joined ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Joined
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-400">
                            <XCircle className="h-3.5 w-3.5" /> Not yet joined
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
