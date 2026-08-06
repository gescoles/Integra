"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, User as UserIcon } from "lucide-react";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "integra_chat_saludado";

export function ChatWidget({ userName }: { userName: string }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);
  const [badge, setBadge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const saludo = `${translate(locale, "chat.saludoConNombre")} ${userName}?`;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  // Al iniciar sesión (una vez por sesión de navegador, no en cada
  // navegación entre páginas), le mostramos al usuario una burbuja con el
  // saludo y encendemos el aviso en el propio icono.
  useEffect(() => {
    const yaSaludado = sessionStorage.getItem(SESSION_KEY);
    if (yaSaludado) return;

    const timer = setTimeout(() => {
      setPeek(true);
      setBadge(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  function handleOpen() {
    setOpen(true);
    setPeek(false);
    setBadge(false);
  }

  function handleTogglePorIcono() {
    if (open) {
      setOpen(false);
    } else {
      handleOpen();
    }
  }

  async function handleSend() {
    const texto = input.trim();
    if (!texto || pending) return;

    const nuevos: Msg[] = [...messages, { role: "user", content: texto }];
    setMessages(nuevos);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nuevos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo contactar con el asistente.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo contactar con el asistente.");
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Burbuja de saludo que aparece sola al entrar */}
      {peek && !open && (
        <div className="fixed bottom-28 right-6 z-40 flex max-w-[260px] items-start gap-2 rounded-2xl rounded-br-sm border border-slate-200 bg-white p-3.5 shadow-xl">
          <button
            onClick={() => setPeek(false)}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-white hover:bg-slate-500"
          >
            <X className="h-3 w-3" />
          </button>
          <button onClick={handleOpen} className="text-left text-sm text-slate-700">
            {saludo}
          </button>
        </div>
      )}

      <button
        onClick={handleTogglePorIcono}
        className={`fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center transition-transform hover:scale-105 ${
          !open ? "animate-float" : ""
        }`}
        aria-label={translate(locale, "chat.abrir")}
      >
        <div className="h-full w-full overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-black/5">
          {open ? (
            <div className="flex h-full w-full items-center justify-center bg-[#2F6FED] text-white">
              <X className="h-6 w-6" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/chatbot-icon.png" alt="" className="h-full w-full object-cover" />
          )}
        </div>
        {badge && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white ring-2 ring-white">
            1
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-28 right-6 z-40 flex h-[520px] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-[#0B1D4D] px-4 py-3.5">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-white/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/chatbot-icon.png" alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{translate(locale, "chat.titulo")}</div>
              <div className="text-[11px] text-slate-300">{translate(locale, "chat.subtitulo")}</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-500">{saludo}</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ${
                    m.role === "user" ? "bg-[#2F6FED]" : "bg-slate-100"
                  }`}
                >
                  {m.role === "user" ? (
                    <UserIcon className="h-3.5 w-3.5 text-white" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/chatbot-icon.png" alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-[#2F6FED] text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/chatbot-icon.png" alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            )}
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
          </div>

          <div className="border-t border-slate-100 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={translate(locale, "chat.placeholder")}
                className="max-h-24 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
              />
              <button
                onClick={handleSend}
                disabled={pending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2F6FED] text-white hover:bg-[#255ed1] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
