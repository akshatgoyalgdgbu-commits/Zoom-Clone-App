"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { ChatMessage } from "@/types/meeting";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentClientId: string;
}

export default function ChatPanel({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentClientId,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <aside className="flex h-full w-80 sm:w-96 flex-col border-l border-zinc-800 bg-[#1f2024] shadow-2xl z-40 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <MessageSquare className="h-4 w-4 text-[#2D8CFF]" />
          <span>In-Meeting Chat</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          title="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No messages yet.</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              Send a message to everyone in the meeting.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentClientId || msg.isSelf;
            return (
              <div
                key={msg.id || `${msg.senderId}-${msg.timestamp}`}
                className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-zinc-400">
                    {isSelf ? "You" : msg.senderName}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs break-words shadow-sm ${
                    isSelf
                      ? "bg-[#2D8CFF] text-white rounded-br-xs"
                      : "bg-zinc-800 text-zinc-100 rounded-bl-xs"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-3 bg-[#18191c]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type message to everyone..."
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2D8CFF] text-white transition hover:bg-[#0E71EB] disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
}
