"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Video, Loader2, Sparkles, ArrowRight, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, guestLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsGuestLoading(true);
    try {
      await guestLogin();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to start guest session.");
    } finally {
      setIsGuestLoading(false);
    }
  };

  const handleQuickFill = (testEmail: string) => {
    setEmail(testEmail);
    setPassword("Secret123!");
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 shadow-xl">
        {/* Zoom Logo & Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2D8CFF] text-white shadow-md mb-3">
            <Video className="h-6 w-6 fill-current" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Sign In to Zoom
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Connect, collaborate, and manage your meetings
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D8CFF] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0E71EB] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-color)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--bg-card)] px-2 text-[var(--text-secondary)]">Or</span>
          </div>
        </div>

        {/* Instant Guest Mode Button */}
        <button
          onClick={handleGuest}
          disabled={isGuestLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2D8CFF]/30 bg-[#2D8CFF]/5 py-2.5 text-xs font-semibold text-[#2D8CFF] transition hover:bg-[#2D8CFF]/15 cursor-pointer"
        >
          {isGuestLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-[#2D8CFF]" />
          )}
          Continue as Guest
        </button>

        {/* Quick Demo Pre-seed Accounts */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] p-3.5">
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2">
            Demo Accounts (Click to autofill):
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill("alice@example.com")}
              className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-primary)] hover:border-[#2D8CFF]"
            >
              Alice (Host)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("bob@example.com")}
              className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-primary)] hover:border-[#2D8CFF]"
            >
              Bob (Attendee)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("carol@example.com")}
              className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-primary)] hover:border-[#2D8CFF]"
            >
              Carol (Attendee)
            </button>
          </div>
        </div>

        {/* Sign up prompt */}
        <p className="text-center text-xs text-[var(--text-secondary)]">
          Don't have an account?{" "}
          <Link href="/signup" className="font-semibold text-[#2D8CFF] hover:underline">
            Sign Up Free
          </Link>
        </p>
      </div>
    </div>
  );
}
