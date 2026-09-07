"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, PlusSquare, Calendar, MonitorUp, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Meeting } from "@/types/meeting";
import { useAuth } from "@/context/AuthContext";

export default function ActionTiles() {
  const router = useRouter();
  const { isAuthenticated, guestLogin } = useAuth();
  const [isStartingInstant, setIsStartingInstant] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const handleStartInstant = async () => {
    setIsStartingInstant(true);
    try {
      if (!isAuthenticated) {
        await guestLogin();
      }
      const now = new Date();
      const res = await api.post<Meeting>("/api/meetings/instant", {
        title: "Instant Meeting",
        scheduled_start: now.toISOString(),
        duration_minutes: 60,
        is_restricted: false,
      });
      router.push(`/meeting/${res.meeting_code}`);
    } catch (err: any) {
      console.error("Failed to create instant meeting:", err);
      alert(err.message || "Failed to start meeting. Please try again.");
    } finally {
      setIsStartingInstant(false);
    }
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.replace(/\D/g, "");
    if (!clean) return;
    router.push(`/join/${clean}`);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {/* 1. New Meeting (Orange/Amber) */}
        <button
          onClick={handleStartInstant}
          disabled={isStartingInstant}
          className="group relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#FF7426] to-[#E65100] p-6 text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-orange-500/25 active:scale-95 disabled:opacity-75 cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
            {isStartingInstant ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Video className="h-8 w-8 fill-current" />
            )}
          </div>
          <span className="mt-3 text-base font-bold">New Meeting</span>
          <span className="mt-0.5 text-xs text-orange-100">Start instantly</span>
        </button>

        {/* 2. Join (Blue) */}
        <button
          onClick={() => setIsJoinModalOpen(true)}
          className="group relative flex flex-col items-center justify-center rounded-2xl bg-[#2D8CFF] p-6 text-white shadow-lg transition-all hover:bg-[#0E71EB] hover:scale-[1.02] hover:shadow-blue-500/25 active:scale-95 cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
            <PlusSquare className="h-8 w-8" />
          </div>
          <span className="mt-3 text-base font-bold">Join</span>
          <span className="mt-0.5 text-xs text-blue-100">Via code or link</span>
        </button>

        {/* 3. Schedule (Blue) */}
        <button
          onClick={() => router.push("/schedule")}
          className="group relative flex flex-col items-center justify-center rounded-2xl bg-[#2D8CFF] p-6 text-white shadow-lg transition-all hover:bg-[#0E71EB] hover:scale-[1.02] hover:shadow-blue-500/25 active:scale-95 cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
            <Calendar className="h-8 w-8" />
          </div>
          <span className="mt-3 text-base font-bold">Schedule</span>
          <span className="mt-0.5 text-xs text-blue-100">Plan & invite</span>
        </button>

        {/* 4. Share Screen / Instant Join */}
        <button
          onClick={() => setIsJoinModalOpen(true)}
          className="group relative flex flex-col items-center justify-center rounded-2xl bg-[#2D8CFF] p-6 text-white shadow-lg transition-all hover:bg-[#0E71EB] hover:scale-[1.02] hover:shadow-blue-500/25 active:scale-95 cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
            <MonitorUp className="h-8 w-8" />
          </div>
          <span className="mt-3 text-base font-bold">Share Screen</span>
          <span className="mt-0.5 text-xs text-blue-100">In a meeting</span>
        </button>
      </div>

      {/* Quick Join Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Join a Meeting</h3>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-card-subtle)]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickJoin} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Meeting ID or Personal Link
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter 9 or 10-digit ID (e.g. 123 456 7890)"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-2 focus:ring-[#2D8CFF]/20 transition"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-subtle)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D8CFF] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0E71EB] disabled:opacity-50 transition cursor-pointer"
                >
                  Join
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
