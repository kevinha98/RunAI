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
  "Hvorfor gjør jeg en terskeløkt i dag?",
  "Jeg er sliten — bør jeg hoppe over langkjøringen?",
  "Hvordan løper jeg mitt beste halvmaraton?",
  "Kneet mitt gjør vondt. Hva bør jeg gjøre?",
  "Kan du justere planen — jeg gikk glipp av denne uken?",
];

const INITIAL_MESSAGE: Message = {
  id: "0",
  role: "assistant",
  content:
    "Hei! Jeg er AI-treneren din. Jeg kjenner din fulle treningshistorikk, nåværende plan og ytelsesdata. Still meg hva som helst — hvorfor du gjør bestemte økter, hvordan du håndterer skader, hvordan du løper et best mulig løp, eller la meg tilpasse planen rundt livets hendelser. Hva tenker du på?",
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
              // hopp over ødelagte biter
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
          content: "Beklager, kunne ikke koble til akkurat nå. Sjekk API-nøkkelen i .env.local.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2F2F0] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#2E2E29] bg-[#111110]">
        <Link href="/dashboard" className="text-[#9A9A92] hover:text-[#F2F2F0] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[rgba(252,82,0,0.10)] rounded-xl flex items-center justify-center">
            <Brain size={18} className="text-[#FC5200]" />
          </div>
          <div>
            <div className="font-bold text-sm">AI-trener</div>
            <div className="text-xs text-[#FC5200] font-semibold">● Online · Drevet av Claude</div>
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
                <div className="w-7 h-7 bg-[rgba(252,82,0,0.10)] rounded-lg flex items-center justify-center mr-3 mt-1 shrink-0">
                  <Brain size={14} className="text-[#FC5200]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-[#FC5200] text-white font-medium"
                    : "bg-[#1A1A17] border border-[#2E2E29] text-[#F2F2F0]"
                }`}
              >
                {message.content || (
                  <span className="flex items-center gap-2 text-[#9A9A92]">
                    <Loader2 size={14} className="animate-spin" />
                    Tenker...
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
                className="text-xs bg-[#1A1A17] border border-[#2E2E29] hover:border-[rgba(252,82,0,0.40)] px-3.5 py-2 rounded-xl text-[#9A9A92] hover:text-[#F2F2F0] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-4 border-t border-[#2E2E29] bg-[#111110]">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Spør treneren din om hva som helst..."
            disabled={loading}
            className="flex-1 bg-[#1A1A17] border border-[#2E2E29] rounded-xl px-4 py-3 text-sm text-[#F2F2F0] placeholder-[#5A5A54] focus:outline-none focus:border-[#FC5200] transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="bg-[#FC5200] text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-[#E04800] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
