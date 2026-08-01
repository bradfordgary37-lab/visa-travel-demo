import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
const key = process.env.GEMINI_API_KEY || "";
const PROMPT = `You are Amina, assistant for Visa Travel and Tours (Bujumbura +25722219656; Kampala +256731419028. Mon-Fri 8-18 CAT).
Rules:
- Tier A (Answer directly): Contacts, hours, GDS, services (ticketing, tours, hotels).
- Tier B (No figures, explain process, hand off): Visas, fares, schedules, bags, changes.
- Tone: Brief (2-3 sentences). Match language (FR/EN). No prices.
- Escalation: Pricing, booking, travel <72h, disruptions, human.`;

const checkEsc = (m: string, c: number) => {
  const t = m.toLowerCase(), kw = ["tarif", "prix", "combien", "acheter", "reserver", "vol", "fare", "cost", "price", "booking", "quote", "demain", "ce soir", "48h", "72h", "tomorrow", "today", "agent", "whatsapp", "phone", "human", "talk", "annuler", "retard", "perdu", "bagage", "bloqu", "refus", "cancel", "delay", "lost", "missed", "emergency"];
  return kw.some(k => t.includes(k)) || c >= 4;
};

const mock = (m: string, f: boolean) => {
  const t = m.toLowerCase();
  if (t.includes("bag") || t.includes("valise")) return f ? "La franchise bagages dépend du vol. Un agent vérifiera." : "Baggage allowance depends on flight. An agent will confirm.";
  if (t.includes("visa") || t.includes("pass")) return f ? "Les visas dépendent de la nationalité." : "Visas depend on nationality.";
  return f ? "Demande enregistrée. Contact : +257 22219656." : "Request noted. Contact: +257 22219656.";
};

export async function POST(req: Request) {
  try {
    const { message: msg, history: hist, locale, sessionId: sid, isAfterHours: ah } = await req.json();
    const isFR = locale === "fr", count = hist ? hist.length : 0;
    if (checkEsc(msg, count)) {
      const ref = `VTT-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: inq, error } = await db.from("inquiries").insert([{
        reference: ref, locale, channel: "chat", name: "Passenger", email: "pending@visa.com", inquiry_type: "ticketing", summary: msg.substring(0, 40), status: "new", after_hours: ah || false, escalated: true, assigned_office: isFR ? "bujumbura" : "kampala", raw_session_id: sid || "session"
      }]).select().single();
      if (error) throw error;
      await db.from("conversations").insert([{ inquiry_id: inq.id, role: "user", content: msg, locale }]);
      const reply = isFR ? `Votre demande a été transmise. Réf: **${ref}**.` : `Your inquiry has been routed. Ref: **${ref}**.`;
      await db.from("conversations").insert([{ inquiry_id: inq.id, role: "assistant", content: reply, locale }]);
      return NextResponse.json({ escalated: true, reference: ref, summary: msg.substring(0, 40), message: reply, inquiryId: inq.id });
    }
    let reply = "";
    if (key) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: key });
        const { text } = await generateText({
          model: google("gemini-1.5-flash"), system: PROMPT,
          messages: [...(hist || []).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })), { role: "user", content: msg }],
          temperature: 0.2
        });
        reply = text;
      } catch { reply = mock(msg, isFR); }
    } else reply = mock(msg, isFR);
    await db.from("conversations").insert([{ inquiry_id: null, role: "user", content: msg, locale }, { inquiry_id: null, role: "assistant", content: reply, locale }]);
    return NextResponse.json({ escalated: false, message: reply });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
