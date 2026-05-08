"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Brain, Send, ArrowLeft, Loader2 } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const SUGGESTED_QUESTIONS = [
  "Why am I doing a threshold run today?",
  "I'm feeling tired — should I skip the long run?",
  "How do I run my best half marathon?",
  "My knee hurts. What should I do?",
  "Can you adjust my plan — I missed this week?",
];

const INITIAL_MESSAGE: Message = {
  id: "0",
  role: "assistant",
  content:
    "Hey! I'm your AI running coach. I know your full training history, current plan, and performance data. Ask me anything — why you're doing certain sessions, how to handle injuries, how to race, or let me adjust your plan around life events. What's on your mind?",
  timestamp: new Date(),
};

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: m.content + delta }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: "Sorry, I couldn't connect right now. Check your API key in .env.local.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d]">
        <Link href="/dashboard" className="text-[#71717a] hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#22c55e]/10 rounded-xl flex items-center justify-center">
            <Brain size={18} className="text-[#22c55e]" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Coach</div>
            <div className="text-xs text-[#22c55e]">● Online · Powered by Claude</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-7 h-7 bg-[#22c55e]/10 rounded-lg flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <Brain size={14} className="text-[#22c55e]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-[#22c55e] text-black font-medium"
                    : "bg-[#141414] border border-[#1f1f1f] text-[#e4e4e7]"
                }`}
              >
                {message.content || (
                  <span className="flex items-center gap-2 text-[#71717a]">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking...
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggested questions (only at start) */}
      {messages.length === 1 && (
        <div className="px-4 pb-4 max-w-3xl mx-auto w-full">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-[#141414] border border-[#1f1f1f] hover:border-[#22c55e]/40 px-3 py-2 rounded-xl text-[#a1a1aa] hover:text-white transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-4 border-t border-[#1f1f1f] bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask your coach anything..."
            disabled={loading}
            className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="bg-[#22c55e] text-black w-11 h-11 rounded-xl flex items-center justify-center hover:bg-[#16a34a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
