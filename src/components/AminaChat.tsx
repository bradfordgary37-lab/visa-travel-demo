"use client";
import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useDemoClock } from "@/context/DemoClockContext";
import { supabase } from "@/lib/supabase";

interface Msg { role: "user" | "assistant"; content: string; isCard?: boolean; ref?: string; sum?: string; inqId?: string; }

export default function AminaChat() {
  const { locale, t } = useLanguage();
  const { getSimulatedTime } = useDemoClock();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sid, setSid] = useState("");
  const [waOpen, setWaOpen] = useState(false);
  const [inq, setInq] = useState<{ ref: string; sum: string } | null>(null);
  const [email, setEmail] = useState("");
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSid(`chat-${Math.floor(100000 + Math.random() * 900000)}`); }, []);
  useEffect(() => { setMessages([{ role: "assistant", content: t("chat_welcome") }]); }, [locale]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const txt = input.trim();
    setInput("");
    const updated = [...messages, { role: "user", content: txt } as Msg];
    setMessages(updated);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: txt, history: updated.slice(1, -1), locale, sessionId: sid, isAfterHours: getSimulatedTime().isAfterHours })
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setMessages(prev => [...prev, d.escalated ? { role: "assistant", content: d.message, isCard: true, ref: d.reference, sum: d.summary, inqId: d.inquiryId } : { role: "assistant", content: d.message }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Communication error. Please try again." }]);
    } finally { setLoading(false); }
  };

  const handleEmail = async (inqId: string) => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return;
    setEmailLoading(true);
    try {
      const { error } = await supabase.from("inquiries").update({ email: email.trim() }).eq("id", inqId);
      if (error) throw error;
      setEmailSuccess(inqId);
    } catch (e) { console.error(e); } finally { setEmailLoading(false); }
  };

  const getWa = (ref: string, sum: string) => locale === "fr"
    ? `Bonjour, je souhaite donner suite à ma demande.\n\nRéférence : ${ref}\nRésumé : ${sum}`
    : `Hello, I would like to follow up on my request.\n\nReference: ${ref}\nSummary: ${sum}`;

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white p-4 rounded-full shadow-2xl border border-slate-800 cursor-pointer">
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-10rem)] bg-slate-950 border border-slate-850 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs md:text-sm text-slate-200">
          <div className="bg-slate-900 border-b border-slate-850 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-slate-100">🤖 {t("chat_title")}</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <span className="text-base">🤖</span>}
                <div className="space-y-3 max-w-[80%]">
                  <div className={`rounded-lg px-3 py-2 leading-relaxed ${m.role === "user" ? "bg-amber-600 text-white rounded-br-none" : "bg-slate-900 border border-slate-800 rounded-bl-none"}`}>
                    {m.content.split(/\*\*([^*]+)\*\*/g).map((p, idx) => idx % 2 === 1 ? <strong key={idx} className="font-bold text-amber-500">{p}</strong> : p)}
                  </div>

                  {m.isCard && m.ref && m.sum && m.inqId && (
                    <div className="bg-slate-900 border border-amber-600/30 rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-1.5 border-b border-slate-850 pb-1.5 text-[10px] uppercase font-mono text-amber-500 font-bold">
                        <span>⚠ {t("chat_escalated_title")}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {t("timeline_ref")} <span className="text-slate-200 font-bold">{m.ref}</span>
                      </p>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => { setInq({ ref: m.ref!, sum: m.sum! }); setWaOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] py-1.5 rounded cursor-pointer">
                          {t("chat_wa_continue")} ➔
                        </button>
                        {emailSuccess === m.inqId ? (
                          <div className="text-[10px] text-emerald-400 font-semibold font-mono text-center bg-emerald-950/20 py-1.5 border border-emerald-900/50 rounded">
                            ✔ {t("chat_email_success")}
                          </div>
                        ) : (
                          <div className="space-y-1.5 border-t border-slate-800/50 pt-1.5">
                            <span className="text-[9px] uppercase font-mono text-slate-500 block">{t("chat_email_leave")}</span>
                            <div className="flex gap-1">
                              <input type="email" placeholder={t("chat_email_placeholder")} value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] outline-none text-white flex-grow" />
                              <button onClick={() => handleEmail(m.inqId!)} disabled={emailLoading || !email.trim()} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 rounded text-[10px]">
                                {t("chat_email_submit")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {m.role === "user" && <span className="text-base">👤</span>}
              </div>
            ))}
            {loading && <div className="text-slate-500 text-xs animate-pulse">🤖 Amina is typing...</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="bg-slate-900 border-t border-slate-850 p-2 flex gap-2">
            <input type="text" placeholder={t("chat_placeholder")} value={input} onChange={e => setInput(e.target.value)} disabled={loading} className="bg-slate-950 border border-slate-850 rounded px-3 py-2 text-xs text-white outline-none flex-grow" />
            <button type="submit" disabled={loading || !input.trim()} className="bg-slate-950 hover:bg-slate-850 text-amber-500 p-2 border border-slate-850 rounded cursor-pointer">
              Send
            </button>
          </form>
        </div>
      )}

      {waOpen && inq && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase">{t("chat_wa_modal_title")}</span>
              <button onClick={() => setWaOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">{t("chat_wa_modal_body")}</p>
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">{t("chat_wa_modal_message_label")}</span>
              <div className="bg-slate-950 border border-slate-850 p-4 rounded text-xs font-mono text-slate-300 whitespace-pre-line select-all">{getWa(inq.ref, inq.sum)}</div>
            </div>
            <div className="pt-2 border-t border-slate-850 text-right">
              <button onClick={() => setWaOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded">
                {t("chat_wa_modal_close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
