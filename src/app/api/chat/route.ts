import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const AMINA_SYSTEM_PROMPT = `You are Amina, travel assistant for Visa Travel and Tours SPRL (founded 2016, IATA agency, Bd du Japon N° 42, Bujumbura, Burundi, +257 22219656, burundi@visatravelandtours.com; Raja Chambers, Kampala, +256 731 419 028, uganda@visatravelandtours.com. Hours: Mon-Fri 08:00-18:00 CAT).
Rules:
- TIER A (Direct Answer): Agency facts, office contact/address, hours, services.
- TIER B (Explain process, hand off, NEVER state figures): Visas (requirements/fees), flights (schedules/fares), baggage, change/cancel penalties, vaccines.
- Tone: Brief (2-4 sentences). Match language (FR or EN). Do not open with handoff. Never promise bookings/prices. Never ask for passport/card details.
- After-hours: If outside office hours, open with: "Good evening. Our offices are closed at the moment, but your message is being recorded now and an agent will respond when we reopen. How can I help in the meantime?" then answer Tier A.
- Escalation triggers: Price quote, seat availability, booking, travel <72h, disruptions, human request.`;

function checkEscalation(message: string, turnCount: number): boolean {
  const text = message.toLowerCase();
  const kw = ["tarif", "prix", "combien", "acheter", "reserver", "vol", "fare", "cost", "price", "booking", "quote", "ticket cost", "seat reservation", "demain", "aujourd'hui", "ce soir", "48h", "72h", "tomorrow", "today", "tonight", "humain", "agent", "conseiller", "directeur", "personne", "whatsapp", "téléphone", "human", "person", "staff", "talk to someone", "annuler", "retard", "perdu", "bagage", "bloqué", "refusé", "cancel", "delay", "lost baggage", "missed flight", "emergency"];
  return kw.some(k => text.includes(k)) || turnCount >= 4;
}

function generateLocalMockResponse(message: string, locale: string): string {
  const text = message.toLowerCase();
  const isFR = locale === "fr";
  if (text.includes("bag") || text.includes("valise") || text.includes("poids")) {
    return isFR ? "La franchise bagages dépend du vol. Un agent vérifiera." : "Baggage allowance depends on flight. An agent will confirm.";
  }
  if (text.includes("visa") || text.includes("passeport")) {
    return isFR ? "Les visas dépendent de votre nationalité. Nos agents vérifient." : "Visas depend on nationality. Our agents verify requirements.";
  }
  return isFR 
    ? "Demande enregistrée. Nos agents basés à Bujumbura/Kampala étudient votre itinéraire. Contact : +257 22219656." 
    : "Request noted. Our agents based in Bujumbura/Kampala will review your plans. Contact: +257 22219656.";
}

export async function POST(req: Request) {
  let sessionId = "unknown";
  try {
    const { message, history, locale, sessionId: reqSessionId, isAfterHours } = await req.json();
    sessionId = reqSessionId || "chat-session-" + Math.floor(Math.random() * 100000);
    if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });
    const turnCount = history ? history.length : 0;

    if (checkEscalation(message, turnCount)) {
      let summary = `Inquiry regarding ${message.substring(0, 40)}...`;
      if (GEMINI_API_KEY) {
        try {
          const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
          const { text } = await generateText({
            model: google("gemini-1.5-flash"),
            messages: [{ role: "user", content: `Summarize: "${message}"` }],
            temperature: 0.2
          });
          summary = text.trim();
        } catch (e) {
          console.warn("Summary failed.");
        }
      }
      const refNum = `VTT-${Math.floor(1000 + Math.random() * 9000)}`;
      const office = locale === "en" ? "kampala" : "bujumbura";
      
      const { data: inquiry, error: inqError } = await supabase
        .from("inquiries")
        .insert([{
          reference: refNum, created_at: new Date().toISOString(), locale, channel: "chat", name: "Passenger", email: "pending@visa.com", phone: null, inquiry_type: "ticketing", route_or_dest: "Nairobi", travel_date: null, passengers: 1, summary, status: "new", after_hours: isAfterHours || false, escalated: true, escalation_reason: "Automated trigger", assigned_office: office, raw_session_id: sessionId
        }])
        .select().single();

      if (inqError) throw inqError;

      await supabase.from("conversations").insert([{ inquiry_id: inquiry.id, created_at: new Date().toISOString(), role: "user", content: message, locale }]);
      const responseText = locale === "fr" 
        ? `Votre demande concernant "${summary}" a été transmise. Référence dossier : **${refNum}**.` 
        : `Your inquiry regarding "${summary}" has been routed to our agents. File reference: **${refNum}**.`;

      await supabase.from("conversations").insert([{ inquiry_id: inquiry.id, created_at: new Date().toISOString(), role: "assistant", content: responseText, locale }]);

      return NextResponse.json({ escalated: true, reference: refNum, summary, message: responseText, inquiryId: inquiry.id });
    }

    let assistantReply = "";
    if (GEMINI_API_KEY) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
        const formattedHistory = (history || []).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
        const { text } = await generateText({
          model: google("gemini-1.5-flash"),
          system: AMINA_SYSTEM_PROMPT,
          messages: [...formattedHistory, { role: "user", content: message }],
          temperature: 0.2
        });
        assistantReply = text;
      } catch (apiError: any) {
        console.warn("AI failed. Fallback:", apiError.message);
        assistantReply = generateLocalMockResponse(message, locale);
      }
    } else {
      assistantReply = generateLocalMockResponse(message, locale);
    }

    await supabase.from("conversations").insert([
      { inquiry_id: null, created_at: new Date().toISOString(), role: "user", content: message, locale },
      { inquiry_id: null, created_at: new Date().toISOString(), role: "assistant", content: assistantReply, locale }
    ]);

    return NextResponse.json({ escalated: false, message: assistantReply });
  } catch (err: any) {
    console.error("Critical error:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
