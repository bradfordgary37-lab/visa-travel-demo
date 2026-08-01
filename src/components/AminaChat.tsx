"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useDemoClock } from "@/context/DemoClockContext";
import { supabase } from "@/lib/supabase";
import { MessageSquare, X, Send, User, Bot, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isEscalationCard?: boolean;
  reference?: string;
  summary?: string;
  inquiryId?: string;
}

export default function AminaChat() {
  const { locale, t } = useLanguage();
  const { getSimulatedTime } = useDemoClock();

  // Layout states
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");

  // Escalation / Handoff states
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<{ reference: string; summary: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailSuccessId, setEmailSuccessId] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize unique session ID and welcome message
  useEffect(() => {
    setSessionId(`chat-session-${Math.floor(100000 + Math.random() * 900000)}`);
  }, []);

  useEffect(() => {
    // Reset messages when locale changes, so welcome matches language
    setMessages([
      {
        role: "assistant",
        content: t("chat_welcome")
      }
    ]);
  }, [locale]);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    
    // Add User Message
    const updatedMessages = [...messages, { role: "user", content: userText } as Message];
    setMessages(updatedMessages);
    setLoading(true);

    const timeInfo = getSimulatedTime();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: updatedMessages.slice(1, -1), // skip welcome message and current user turn
          locale,
          sessionId,
          isAfterHours: timeInfo.isAfterHours
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.escalated) {
        // Add escalation message and card
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            isEscalationCard: true,
            reference: data.reference,
            summary: data.summary,
            inquiryId: data.inquiryId
          }
        ]);
      } else {
        // Normal conversation turn
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: data.message
          }
        ]);
      }
    } catch (err) {
      console.error("Chat client error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an internal communication error. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Submit email to link with escalated inquiry
  const handleEmailSubmit = async (inquiryId: string) => {
    if (!emailInput.trim() || !/\S+@\S+\.\S+/.test(emailInput)) return;
    
    setEmailLoading(true);
    try {
      const { error } = await supabase
        .from("inquiries")
        .update({ email: emailInput.trim() })
        .eq("id", inquiryId);

      if (error) throw error;

      setEmailSuccessId(inquiryId);
    } catch (e) {
      console.error("Failed to link email:", e);
    } finally {
      setEmailLoading(false);
    }
  };

  const getWaMessage = (ref: string, summary: string) => {
    return locale === "fr"
      ? `Bonjour, je souhaite donner suite à ma demande de voyage avec Visa Travel & Tours.\n\nRéférence : ${ref}\nRésumé : ${summary}`
      : `Hello, I would like to follow up on my travel request with Visa Travel & Tours.\n\nReference: ${ref}\nSummary: ${summary}`;
  };

  return (
    <>
      {/* Floating Chat Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 cursor-pointer border border-slate-800"
        aria-label="Open Chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6 text-amber-500" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-10rem)] bg-slate-950 border border-slate-850 rounded-xl shadow-2xl flex flex-col overflow-hidden font-sans">
          
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-850 px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></div>
              <div>
                <h4 className="font-serif text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Bot className="h-4 w-4 text-amber-500" />
                  {t("chat_title")}
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">EN/FR Mode Active</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages scroll box */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-950">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                
                {/* Bot Icon */}
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-amber-500" />
                  </div>
                )}

                {/* Message Bubble */}
                <div className="space-y-3 max-w-[80%]">
                  <div 
                    className={`rounded-lg px-3.5 py-2 text-xs md:text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-amber-600 text-white rounded-br-none"
                        : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                    }`}
                  >
                    {msg.content.split(/\*\*([^*]+)\*\*/g).map((part, index) => 
  index % 2 === 1 ? <strong key={index} className="font-bold text-amber-500">{part}</strong> : part
)}}
                  </div>

                  {/* Escalation/Handoff Card inside bubble */}
                  {msg.isEscalationCard && msg.reference && msg.summary && msg.inquiryId && (
                    <div className="bg-slate-900 border border-amber-600/30 rounded-lg p-4 space-y-4 shadow-md">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-[10px] uppercase font-mono font-bold text-amber-500">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t("chat_escalated_title")}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 font-mono">
                        {t("timeline_ref")} <span className="text-slate-200 font-bold">{msg.reference}</span>
                      </p>

                      <div className="flex flex-col gap-2 pt-1">
                        {/* WA Continue */}
                        <button
                          onClick={() => {
                            setSelectedInquiry({ reference: msg.reference!, summary: msg.summary! });
                            setWaModalOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] py-2 rounded text-center transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          {t("chat_wa_continue")}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>

                        {/* Leave Email Block */}
                        {emailSuccessId === msg.inquiryId ? (
                          <div className="text-[10px] text-emerald-400 font-semibold font-mono flex items-center gap-1 justify-center bg-emerald-950/20 py-2 border border-emerald-900/50 rounded">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("chat_email_success")}
                          </div>
                        ) : (
                          <div className="space-y-2 border-t border-slate-800/50 pt-2">
                            <span className="text-[9px] uppercase font-mono font-bold text-slate-500 block">
                              {t("chat_email_leave")}
                            </span>
                            <div className="flex gap-1">
                              <input
                                type="email"
                                placeholder={t("chat_email_placeholder")}
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-[11px] outline-none focus:border-amber-600 flex-grow text-white"
                              />
                              <button
                                onClick={() => handleEmailSubmit(msg.inquiryId!)}
                                disabled={emailLoading || !emailInput.trim()}
                                className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 font-bold text-[10px] px-2.5 rounded transition-all cursor-pointer"
                              >
                                {t("chat_email_submit")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Icon */}
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-amber-600/10 border border-amber-600/20 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-amber-500" />
                  </div>
                )}

              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-amber-500 animate-bounce" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg rounded-bl-none px-3.5 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                    <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input field */}
          <form onSubmit={handleSend} className="bg-slate-900 border-t border-slate-850 p-2.5 flex gap-2">
            <input
              type="text"
              placeholder={t("chat_placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="bg-slate-950 border border-slate-850 rounded-md px-3 py-2 text-xs md:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-600 flex-grow"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-slate-950 hover:bg-slate-850 disabled:bg-slate-950 text-amber-500 hover:text-amber-400 p-2 border border-slate-850 hover:border-slate-800 rounded-md transition-all cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}

      {/* WhatsApp Demo Modal overlay */}
      {waModalOpen && selectedInquiry && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full shadow-2xl overflow-hidden font-sans">
            
            <div className="bg-slate-950 px-4 py-3.5 border-b border-slate-850 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider">
                {t("chat_wa_modal_title")}
              </span>
              <button 
                onClick={() => setWaModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                {t("chat_wa_modal_body")}
              </p>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">
                  {t("chat_wa_modal_message_label")}
                </span>
                <div className="bg-slate-950 border border-slate-850 p-4 rounded text-xs font-mono text-slate-300 whitespace-pre-line leading-relaxed select-all">
                  {getWaMessage(selectedInquiry.reference, selectedInquiry.summary)}
                </div>
                <span className="text-[9px] text-slate-600 font-mono block text-right">
                  💡 Hint: Single click to select all text for copying.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-850 text-right">
                <button
                  onClick={() => setWaModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-4 py-2 rounded transition-all cursor-pointer"
                >
                  {t("chat_wa_modal_close")}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
