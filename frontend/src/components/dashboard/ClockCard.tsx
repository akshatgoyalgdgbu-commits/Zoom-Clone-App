"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Clock, Sparkles } from "lucide-react";

export default function ClockCard() {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1b439c] via-[#2D8CFF] to-[#0E71EB] p-8 text-white shadow-xl">
      <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-black/10 blur-2xl" />

      <div className="relative z-10 flex flex-col justify-between md:flex-row md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome to Zoom"}
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight font-mono">
            {timeStr || "--:--"}
          </h1>
          <p className="mt-2 text-base md:text-lg text-blue-100 font-medium">
            {dateStr || "Loading date..."}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-3.5 backdrop-blur-md border border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
            <Clock className="h-5 w-5" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-white">Fast, Secure HD Meetings</p>
            <p className="text-blue-200">Connect with peer-to-peer WebRTC & encrypted signaling</p>
          </div>
        </div>
      </div>
    </div>
  );
}
