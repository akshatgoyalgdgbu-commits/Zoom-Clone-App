"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ClockCard from "@/components/dashboard/ClockCard";
import ActionTiles from "@/components/dashboard/ActionTiles";
import MeetingCard from "@/components/dashboard/MeetingCard";
import { api } from "@/lib/api";
import { Meeting } from "@/types/meeting";
import { Calendar, Search, Loader2, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { user, isAuthenticated, guestLogin } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"upcoming" | "all">("upcoming");

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<Meeting[]>("/api/meetings");
      setMeetings(data);
    } catch (err) {
      console.warn("Could not load meetings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [isAuthenticated]);

  const handleDeleteMeeting = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this meeting?")) return;
    try {
      await api.delete(`/api/meetings/${id}`);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete meeting.");
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.meeting_code.includes(searchQuery.replace(/\D/g, ""));

    if (!matchesSearch) return false;
    if (filterTab === "upcoming") {
      return m.status === "scheduled" || m.status === "active";
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Top Banner & Time Card */}
      <ClockCard />

      {/* Main 4 Action Tiles */}
      <div>
        <ActionTiles />
      </div>

      {/* Meetings Section */}
      <section id="meetings-section" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#2D8CFF]" />
              Scheduled Meetings
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              View and start your upcoming video sessions
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meetings..."
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center rounded-xl bg-[var(--bg-card-subtle)] p-1 border border-[var(--border-color)]">
              <button
                onClick={() => setFilterTab("upcoming")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filterTab === "upcoming"
                    ? "bg-[var(--bg-card)] text-[#2D8CFF] shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilterTab("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filterTab === "all"
                    ? "bg-[var(--bg-card)] text-[#2D8CFF] shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Meeting Cards Grid */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#2D8CFF]" />
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2D8CFF]/10 text-[#2D8CFF] mb-3">
              <Calendar className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {searchQuery ? "No matching meetings found" : "No upcoming meetings scheduled"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-secondary)]">
              {searchQuery
                ? "Try searching by another title or meeting code."
                : "Schedule a session in advance or start an instant meeting to connect with your team."}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link
                href="/schedule"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D8CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E71EB] transition"
              >
                <Plus className="h-4 w-4" />
                Schedule Meeting
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMeetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                currentUserId={user?.id}
                onDelete={handleDeleteMeeting}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
