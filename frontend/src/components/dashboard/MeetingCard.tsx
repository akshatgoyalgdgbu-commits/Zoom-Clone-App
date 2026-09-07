"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDateTime, formatMeetingCode } from "@/lib/utils";
import { Meeting } from "@/types/meeting";
import {
  Calendar,
  Clock,
  Copy,
  Check,
  Video,
  Users,
  Shield,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface MeetingCardProps {
  meeting: Meeting;
  currentUserId?: number;
  onDelete?: (id: number) => void;
}

export default function MeetingCard({ meeting, currentUserId, onDelete }: MeetingCardProps) {
  const [copied, setCopied] = useState(false);
  const isHost = currentUserId === meeting.host_id;

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/join/${meeting.meeting_code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    ended: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm transition-all hover:border-[#2D8CFF]/50 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  statusColors[meeting.status] || statusColors.scheduled
                }`}
              >
                {meeting.status}
              </span>
              {meeting.is_restricted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600">
                  <Shield className="h-3 w-3" />
                  Allow-list
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] line-clamp-1">
              {meeting.title}
            </h3>
            {meeting.description && (
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {meeting.description}
              </p>
            )}
          </div>

          {isHost && onDelete && (
            <button
              onClick={() => onDelete(meeting.id)}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
              title="Cancel Meeting"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#2D8CFF]" />
            <span>{formatDateTime(meeting.scheduled_start)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#2D8CFF]" />
            <span>{meeting.duration_minutes} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#2D8CFF]" />
            <span>
              Meeting ID:{" "}
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {formatMeetingCode(meeting.meeting_code)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border-color)] pt-4">
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-subtle)] hover:text-[var(--text-primary)]"
          title="Copy Invitation Link"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Link</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <Link
            href={`/meetings/${meeting.meeting_code}`}
            className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-subtle)] hover:text-[var(--text-primary)]"
          >
            Details
          </Link>
          <Link
            href={`/meeting/${meeting.meeting_code}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D8CFF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0E71EB]"
          >
            <Video className="h-3.5 w-3.5" />
            <span>{isHost ? "Start" : "Join"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
