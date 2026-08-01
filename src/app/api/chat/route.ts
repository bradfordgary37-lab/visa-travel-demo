import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
const key = process.env.GEMINI_API_KEY || "";
const AMINA_SYSTEM_PROMPT = `You are Amina, assistant for Visa Travel and Tours (Bd du Japon N42 Bujumbura +25722219656; Raja Chambers Kampala +256731419028. Mon-Fri 8-18 CAT).
Rules:
- Tier A: Office contacts, hours, GDS, services (ticketing, bespoke tours, hotels).
- Tier B: Visas, flight schedules/fares, baggage, change rules (Explain process, hand off, NO figures).
- Chat: Brief (2-4 sentences). FR/EN. No pricing.
- Escalation: Pricing, booking, travel <72h, disruptions, human.`;

function checkEsc(msg: string, count: number): boolean {
  const text = msg.toLowerCase();
  const kw = ["tarif", "prix", "combien", "acheter", "reserver", "vol", "fare", "cost", "price", "booking", "quote", "demain", "aujourd'hui", "ce soir", "48h", "72h", "tomorrow", "today", "tonight", "agent", "conseiller", "whatsapp", "phone", "human", "talk", "annuler", "retard", "perdu", "bagage", "bloqu", "refus", "cancel", "delay", "lost", "missed", "emergency"];
  return kw.some(k => text.includes(k)) || count >= 4;
}

function mockResp(msg: string, locale: string): string {
  const text = msg.toLowerCase();
  const isFR = locale === "fr";
  if (text.includes("bag") || text.includes("valise") || text.includes("poids")) {
    return isFR ? "La franchise bagages dépend du vol. Un agent vérifiera." : "Baggage allowance depends on flight. An agent will confirm.";
  }
  if (text.includes("visa") || text.includes("passeport")) {
    return isFR ? "Les visas dépendent de votre nationalité. Nos agents vérifient." : "Visas depend on nationality. Our agents verify requirements.";
  }
  return isFR ? "Demande enregistrée. Nos agents basés à Bujumbura/Kampala étudient votre itinéraire. Contact : +257 22219656." : "Request noted. Our agents based in Bujumbura/Kampala will review your plans. Contact: +257 22219656.";
}

export async function POST(req: Request) {
  try {
    const { message, history, locale, sessionId, isAfterHours } = await req.json();
    const count = history ? history.length : 0;
    if (checkEsc(message, count)) {
      const ref = `VTT-${Math.floor(1000 + Math.random() * 9000)}`;
      const summary = message.substring(0, 40);
      const { data: inq, error } = await db.from("inquiries").insert([{
        reference: ref, locale, channel: "chat", name: "Passenger", email: "pending@visa.com", inquiry_type: "ticketing", summary, status: "new", after_hours: isAfterHours || false, escalated: true, assigned_office: locale === "en" ? "kampala" : "bujumbura", raw_session_id: sessionId || "session"
      }]).select().single();
      if (error) throw error;
      await db.from("conversations").insert([{ inquiry_id: inq.id, role: "user", content: message, locale }]);
      const reply = locale === "fr" ? `Votre demande a été transmise. Réf: **${ref}**.` : `Your inquiry has been routed. Ref: **${ref}**.`;
      await db.from("conversations").insert([{ inquiry_id: inq.id, role: "assistant", content: reply, locale }]);
      return NextResponse.json({ escalated: true, reference: ref, summary, message: reply, inquiryId: inq.id });
    }
    let replyText = "";
    if (key) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: key });
        const historyMsgs = (history || []).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
        const { text } = await generateText({
          model: google("gemini-1.5-flash"),
          system: AMINA_SYSTEM_PROMPT,
          messages: [...historyMsgs, { role: "user", content: message }],
          temperature: 0.2
        });
        replyText = text;
      } catch (e) {
        replyText = mockResp(message, locale);
      }
    } else {
      replyText = mockResp(message, locale);
    }
    await db.from("conversations").insert([
      { inquiry_id: null, role: "user", content: message, locale },
      { inquiry_id: null, role: "assistant", content: replyText, locale }
    ]);
    return NextResponse.json({ escalated: false, message: replyText });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
