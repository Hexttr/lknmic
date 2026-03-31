"use client";

import { useCallback, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

export function PriceAssistantPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    const nextMsgs: Msg[] = [...messages, { role: "user", text }];
    setMessages(nextMsgs);
    setLoading(true);
    try {
      const res = await fetch("/api/patient/price-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string; reply?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка запроса");
        return;
      }
      if (typeof data.reply === "string") {
        setMessages([...nextMsgs, { role: "assistant", text: data.reply }]);
        setTimeout(scrollToEnd, 50);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/80">
      <div className="max-h-72 min-h-[8rem] space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Например: «ребёнок часто болеет ОРВИ» или «нужна консультация
            аллерголога».
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-4 rounded-lg bg-[#0c2847] px-3 py-2 text-sm text-white"
                : "mr-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
            }
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <p className="text-sm text-zinc-500">Ответ…</p>
        )}
        <div ref={endRef} />
      </div>
      {error && (
        <p className="border-t border-zinc-200 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2 border-t border-zinc-200 p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ваш вопрос…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#0c2847]"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-lg bg-[#0c2847] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a1f38] disabled:opacity-50"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
