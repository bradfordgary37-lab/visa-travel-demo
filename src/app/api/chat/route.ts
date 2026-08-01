import { NextResponse as Res } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI as ai } from "@ai-sdk/google";
import { generateText } from "ai";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
const key = process.env.GEMINI_API_KEY || "";
const PROMPT = `You are Amina, assistant for Visa Travel and Tours (Bujumbura +25722219656; Kampala +256731419028. Mon-Fri 8-18 CAT).
Rules:
- Tier A (Answer directly): Contacts, hours, GDS, services.
- Tier B (Explain process, hand off, NO figures): Visas, fares, schedules, baggage, changes.
- Tone: Brief (2-3 sentences). Match language (FR/EN). No prices.
- Escalation: Pricing, booking, travel <72h, disruptions, human requests.`;

const isEsc = (m: string, c: number) => c >= 4 || ["tarif", "prix", "combien", "acheter", "reserver", "vol", "fare", "cost", "price", "booking", "quote", "demain", "ce soir", "48h", "72h", "tomorrow", "today", "agent", "whatsapp", "phone", "human", "talk", "annuler", "retard", "perdu", "bagage", "cancel", "delay", "lost", "missed", "emergency"].some(k => m.toLowerCase().includes(k));

export async function POST(req: Request) {
  try {
    const { message: msg, history: hist, locale, sessionId: sid, isAfterHours: ah } = await req.json();
    const isFR = locale === "fr", count = hist ? hist.length : 0;
    if (isEsc(msg, count)) {
      const ref = `VTT-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: inq } = await db.from("inquiries").insert([{
        reference: ref, locale, channel: "chat", name: "Passenger", email: "pending@visa.com", inquiry_type: "ticketing", summary: msg.substring(0, 40), status: "new", after_hours: ah || false, escalated: true, assigned_office: isFR ? "bujumbura" : "kampala", raw_session_id: sid || "session"
      }]).select().single();
      await db.from("conversations").insert([{ inquiry_id: inq.id, role: "user", content: msg, locale }]);
      const reply = isFR ? `Votre demande a été transmise. Réf: **${ref}**.` : `Your inquiry has been routed. Ref: **${ref}**.`;
      await db.from("conversations").insert([{ inquiry_id: inq.id, role: "assistant", content: reply, locale }]);
      return Res.json({ escalated: true, reference: ref, summary: msg.substring(0, 40), message: reply, inquiryId: inq.id });
    }
    let reply = "";
    if (key) {
      try {
        const { text } = await generateText({
          model: ai({ apiKey: key })("gemini-1.5-flash"), system: PROMPT,
          messages: [...(hist || []).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })), { role: "user", content: msg }],
          temperature: 0.2
        });
        reply = text;
      } catch { reply = isFR ? "Demande enregistrée. Bureau Bujumbura : +257 22219656." : "Request registered. Kampala Office: +256 731 419 028."; }
    } else reply = isFR ? "Demande enregistrée. Bureau Bujumbura : +257 22219656." : "Request registered. Kampala Office: +256 731 419 028.";
    await db.from("conversations").insert([{ inquiry_id: null, role: "user", content: msg, locale }, { inquiry_id: null, role: "assistant", content: reply, locale }]);
    return Res.json({ escalated: false, message: reply });
  } catch (err: any) { return Res.json({ error: err.message }, { status: 500 }); }
}
