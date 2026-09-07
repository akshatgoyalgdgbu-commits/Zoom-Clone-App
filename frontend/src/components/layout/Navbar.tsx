"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/utils";
import {
  Sun,
  Moon,
  Video,
  Home,
  Calendar,
  Users,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, guestLogin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname.startsWith("/meeting/")) {
    return null;
  }

  const navLinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "Meetings", href: "/#meetings-section", icon: Calendar },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "Join", href: "/join", icon: Users },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg-card)]/90 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2D8CFF] text-white shadow-sm transition-transform group-hover:scale-105">
                <Video className="h-5 w-5 fill-current" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-[#2D8CFF]">
                zoom
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#2D8CFF]/10 text-[#2D8CFF]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-subtle)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-subtle)] hover:text-[var(--text-primary)]"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </button>

            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full p-1 transition hover:ring-2 hover:ring-[#2D8CFF]/30"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2D8CFF] to-indigo-600 text-xs font-semibold text-white shadow-sm">
                    {getInitials(user.name)}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 shadow-xl ring-1 ring-black/5 z-50">
                    <div className="border-b border-[var(--border-color)] px-3 py-2.5">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {user.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setSettingsModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-subtle)] transition"
                      >
                        <SettingsIcon className="h-4 w-4 text-[var(--text-secondary)]" />
                        Settings
                      </button>
                    </div>

                    <div className="border-t border-[var(--border-color)] pt-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                          router.push("/login");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await guestLogin();
                    router.push("/");
                  }}
                  className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#2D8CFF]/30 bg-[#2D8CFF]/10 px-3 py-1.5 text-xs font-medium text-[#2D8CFF] hover:bg-[#2D8CFF]/20 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Continue as Guest
                </button>
                <Link
                  href="/login"
                  className="rounded-lg bg-[#2D8CFF] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#0E71EB] transition"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-[#2D8CFF]" />
                Settings
              </h3>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-card-subtle)]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 py-4 text-sm text-[var(--text-secondary)]">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">User Profile</p>
                <p>{user?.name} ({user?.email})</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Theme Preference</p>
                <p className="capitalize">Currently in {theme} mode</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Audio & Video Devices</p>
                <p>Default microphone and camera are automatically detected upon joining a meeting room.</p>
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="rounded-lg bg-[#2D8CFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0E71EB] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
