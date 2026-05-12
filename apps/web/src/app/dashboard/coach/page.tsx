"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Brain, Send, ArrowLeft, Loader2, Trash2 } from "lucide-react";

/** Render markdown-lite: bold, bullet lists, numbered lists, line breaks */
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  function renderInline(text: string): React.ReactNode {
    // Bold: **text** or __text__
    const parts = text.split(/(\*\*.*?\*\*|__.*?__)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("__") && part.endsWith("__"))
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      return part;
    });
  }

  while (i < lines.length) {
    const line = lines[i];
    // Bullet list
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-1">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-1">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    }
    // Heading: ### or ##
    if (/^#{1,3}\s/.test(line)) {
      elements.push(
        <p key={`h-${i}`} className="font-semibold mt-2 mb-0.5">
          {renderInline(line.replace(/^#{1,3}\s/, ""))}
        </p>
      );
      i++;
      continue;
    }
    // Empty line → spacer
    if (line.trim() === "") {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      i++;
      continue;
    }
    // Normal paragraph
    elements.push(<p key={`p-${i}`}>{renderInline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const QUICK_QUESTIONS = [
  "Hvordan ser uka ut?",
  "Hva bør jeg gjøre dagen før langturen?",
  "Er jeg på rett spor mot maratonen?",
  "Hva er riktig innsats på terskelløkt?",
  "Hjelp meg med restitusjon",
] as const;

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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved conversation + memory count from DB on mount
  useEffect(() => {
    fetch("/api/coach/history")
      .then((r) => r.json())
      .then((data) => {
        const saved: { role: "user" | "assistant"; content: string }[] = data.messages ?? [];
        if (saved.length > 0) {
          setMessages([
            INITIAL_MESSAGE,
            ...saved.map((m, i) => ({
              id: `saved-${i}`,
              role: m.role,
              content: m.content,
              timestamp: new Date(),
            })),
          ]);
        }
        setMemoryCount((data.memories ?? []).length);
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save conversation to DB (fire-and-forget)
  const saveHistory = useCallback((msgs: Message[]) => {
    const payload = msgs
      .filter((m) => m.role === "user" || (m.role === "assistant" && m.content.trim()))
      .filter((m) => m.id !== "0") // exclude initial greeting
      .map((m) => ({ role: m.role, content: m.content }));
    fetch("/api/coach/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payload }),
    }).catch(() => {});
  }, []);

  async function clearMemory() {
    if (!confirm("Slette hele samtalehistorikken og minnet? Dette kan ikke angres.")) return;
    await fetch("/api/coach/history", { method: "DELETE" });
    setMessages([INITIAL_MESSAGE]);
    setMemoryCount(0);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    setInput("");
    setLoading(true);

    let finalAssistantContent = "";
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedWithUser.map((m) => ({
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
                finalAssistantContent += delta;
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

      // Save full conversation after streaming completes
      const finalMessages = [
        ...updatedWithUser,
        { ...assistantMessage, content: finalAssistantContent },
      ];
      saveHistory(finalMessages);
      // Refresh memory count in background
      fetch("/api/coach/history")
        .then((r) => r.json())
        .then((d) => setMemoryCount((d.memories ?? []).length))
        .catch(() => {});
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

  function handleQuickQuestion(question: string) {
    setInput(question);
    sendMessage(question);
  }

  // Samtalen er "tom" hvis det ikke finnes noen brukermeldinger
  const isConversationEmpty = messages.every((m) => m.role === "assistant");

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#E5E5E2] bg-white">
        <Link href="/dashboard" className="text-[#6B6B65] hover:text-[#111110] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[rgba(252,82,0,0.10)] rounded-xl flex items-center justify-center">
            <Brain size={18} className="text-[#FC5200]" />
          </div>
          <div>
            <div className="font-bold text-sm">AI-trener</div>
            <div className="text-xs text-[#FC5200] font-semibold">
              ● Online · Drevet av Claude{memoryCount > 0 ? ` · ${memoryCount} minner` : ""}
            </div>
          </div>
        </div>
        <button
          onClick={clearMemory}
          title="Slett samtalehistorikk og minne"
          className="ml-auto flex items-center gap-1.5 text-xs text-[#9B9B95] hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={13} />
          Nullstill minne
        </button>
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
                    : "bg-white border border-[#E5E5E2] text-[#111110]"
                }`}
              >
                {message.content ? (
                  message.role === "assistant"
                    ? <MessageContent content={message.content} />
                    : message.content
                ) : (
                  <span className="flex items-center gap-2 text-[#6B6B65]">
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

      {/* Input area */}
      <div className="border-t border-[#E5E5E2] bg-white">
        {/* Quick question buttons – only shown when conversation is empty */}
        {isConversationEmpty && (
          <div className="px-4 pt-3 pb-0 max-w-3xl mx-auto w-full">
            <p className="text-[10px] font-semibold text-[#9B9B95] uppercase tracking-wide mb-2">
              Hurtigspørsmål
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-wrap">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickQuestion(question)}
                  className="flex-shrink-0 text-xs font-medium px-3.5 py-2 rounded-xl border border-[#E5E5E2] bg-white text-[#6B6B65] hover:border-[rgba(252,82,0,0.40)] hover:text-[#111110] hover:bg-[#FFF8F5] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 whitespace-nowrap"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text input */}
        <div className="px-4 py-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Spør treneren din om hva som helst..."
              disabled={loading}
              className="flex-1 bg-white border border-[#E5E5E2] rounded-xl px-4 py-3 text-sm text-[#111110] placeholder-[#A0A09A] focus:outline-none focus:border-[#FC5200] transition-colors disabled:opacity-50"
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
    </div>
  );
}
