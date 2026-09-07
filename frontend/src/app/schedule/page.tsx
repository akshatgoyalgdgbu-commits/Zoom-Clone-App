"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Meeting, UploadResult } from "@/types/meeting";
import {
  Calendar,
  Clock,
  Lock,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Shield,
  Users,
} from "lucide-react";

export default function SchedulePage() {
  const router = useRouter();
  const { isAuthenticated, guestLogin } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  );
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");

  // Upload attendee allow-list
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload<UploadResult>("/api/upload/parse-attendees", formData);
      setUploadResult(res);
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse attendee file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (!isAuthenticated) {
        await guestLogin();
      }

      const payload: any = {
        title: title.trim() || "Scheduled Zoom Meeting",
        description: description.trim() || null,
        scheduled_start: new Date(startDate).toISOString(),
        duration_minutes: Number(durationMinutes),
        password: hasPassword && password ? password : null,
        is_restricted: !!uploadResult && uploadResult.participants.length > 0,
        allowed_participants: uploadResult ? uploadResult.participants : [],
      };

      const res = await api.post<Meeting>("/api/meetings", payload);
      router.push(`/meetings/${res.meeting_code}`);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to schedule meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-xl">
        <div className="border-b border-[var(--border-color)] pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[#2D8CFF]" />
            Schedule a Meeting
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Configure your meeting settings, passcode security, and attendee allow-list.
          </p>
        </div>

        {submitError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Topic / Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Product Sync"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda, discussion points, or notes"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
            />
          </div>

          {/* Date and Time & Duration */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-2 text-xs text-[var(--text-primary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-2 text-xs text-[var(--text-primary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Passcode Security */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-[#2D8CFF]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Passcode Protection</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Only attendees with the passcode can enter</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => setHasPassword(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2D8CFF] cursor-pointer"
              />
            </div>

            {hasPassword && (
              <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter meeting passcode (e.g. 123456)"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-xs text-[var(--text-primary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                />
              </div>
            )}
          </div>

          {/* Attendee Allow-List Upload (CSV / Excel) */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Restricted Attendee Allow-List</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Upload CSV or Excel (.xlsx) file to restrict access to authorized guests only
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <label className="flex items-center gap-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] shadow-sm hover:border-[#2D8CFF] cursor-pointer">
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#2D8CFF]" />
                ) : (
                  <Upload className="h-4 w-4 text-[#2D8CFF]" />
                )}
                <span>{uploadResult ? "Replace Attendee File" : "Upload CSV / Excel"}</span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadResult && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {uploadResult.total_parsed} attendee(s) loaded ({uploadResult.filename})
                  </span>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" />
                {uploadError}
              </p>
            )}

            {/* Preview of Parsed Attendees */}
            {uploadResult && uploadResult.participants.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                      <th className="py-1 px-2">Name</th>
                      <th className="py-1 px-2">Email</th>
                      <th className="py-1 px-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.participants.slice(0, 10).map((p, idx) => (
                      <tr key={idx} className="border-b border-[var(--border-color)]/50 last:border-0">
                        <td className="py-1 px-2 font-medium text-[var(--text-primary)]">{p.name}</td>
                        <td className="py-1 px-2 text-[var(--text-secondary)]">{p.email}</td>
                        <td className="py-1 px-2 text-[var(--text-secondary)]">{p.phone || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadResult.participants.length > 10 && (
                  <p className="text-center text-[10px] text-[var(--text-secondary)] pt-1">
                    ...and {uploadResult.participants.length - 10} more attendees
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-subtle)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2D8CFF] px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#0E71EB] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Schedule Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
