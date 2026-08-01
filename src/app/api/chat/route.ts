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

const AMINA_SYSTEM_PROMPT = `You are Amina, travel assistant for Visa Travel and Tours SPRL (founded 2016, IATA agency, Bujumbura, Burundi). Speak FR or EN.
Rules:
1. TIERS:
- TIER A (Direct Answer): Agency facts, offices, hours (Mon-Fri 08:00-18:00 CAT, closed weekends), GDS (Amadeus/Galileo), BJM airport, services (ticketing, bespoke tours, hotels).
- TIER B (Explain process, hand off, NEVER state figures): Visas (requirements/fees), flights (schedules/fares), baggage, changes/cancel penalties, vaccines.
2. CONVERSATION:
- Brief (2-4 sentences max). Match FR/EN. Answer first (no initial handoff).
- Never promise bookings/prices. Never invent fares, schedules, visa fees, baggage, or penalties. Never ask for passport/card details.
3. CONTACTS:
- Bujumbura: Bd du Japon N° 42, +257 22219656, burundi@visatravelandtours.com
- Kampala: Raja Chambers, Plot 3A, Parliament Ave, +256 731 419 028, uganda@visatravelandtours.com
4. FAQs:
- Changes/refunds: Depends on airline rules. Traveler must give booking ref for agent check.
- Flights (Kigali, Nairobi, Brussels): Served, but carrier/schedule details are Tier B. Agents check GDS.
- Visas: Depends on nationality/destination. Agents handle requirements/applications. EAC travel has bloc terms.
5. AFTER-HOURS:
If outside Mon-Fri 08:00-18:00 CAT, open with: "Good evening. Our offices are closed at the moment, but your message is being recorded now and an agent will respond when we reopen. How can I help in the meantime?" Then answer Tier A.
6. ESCALATION: Fares, seat availability, bookings, travel <72h, disruptions, human requests, or 2 consecutive unanswered turns. Summarize query & assign reference.`;

function checkEscalation(message: string, turnCount: number): { trigger: boolean; reason: string | null } {
  const text = message.toLowerCase();
  const pricingKeywords = ["tarif", "prix", "combien", "acheter", "reserver", "vol", "fare", "cost", "price", "booking", "quote", "ticket cost", "seat reservation"];
  if (pricingKeywords.some(kw => text.includes(kw))) return { trigger: true, reason: "Pricing / Booking inquiry" };
  const urgencyKeywords = ["demain", "aujourd'hui", "ce soir", "2 jours", "48h", "72h", "tomorrow", "today", "tonight", "next 2 days", "next 3 days", "within 48 hours"];
  if (urgencyKeywords.some(kw => text.includes(kw))) return { trigger: true, reason: "Urgent travel (< 72h)" };
  const humanKeywords = ["humain", "agent", "conseiller", "directeur", "personne", "whatsapp", "téléphone", "human", "agent", "person", "staff", "talk to someone", "representative"];
  if (humanKeywords.some(kw => text.includes(kw))) return { trigger: true, reason: "Explicit human request" };
  const disruptionKeywords = ["annuler", "retard", "perdu", "bagage", "bloqué", "refusé", "cancel", "delay", "lost baggage", "missed flight", "denied boarding", "emergency"];
  if (disruptionKeywords.some(kw => text.includes(kw))) return { trigger: true, reason: "Travel disruption / Emergency" };
  if (turnCount >= 4) return { trigger: true, reason: "Dialogue limit reached" };
  return { trigger: false, reason: null };
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
  if (text.includes("horaire") || text.includes("ouvert") || text.includes("heure") || text.includes("hour") || text.includes("open")) {
    return isFR ? "Ouvert du lundi au vendredi, de 08h00 à 18h00 CAT." : "Open Monday to Friday, from 08:00 AM to 06:00 PM CAT.";
  }
  return isFR ? "Demande enregistrée. Nos agents basés à Bujumbura/Kampala étudient votre itinéraire. Contact : +257 22219656." : "Request noted. Our agents based in Bujumbura/Kampala will review your plans. Contact: +257 22219656.";
}

export async function POST(req: Request) {
  let sessionId = "unknown";
  try {
    const { message, history, locale, sessionId: reqSessionId, isAfterHours } = await req.json();
    sessionId = reqSessionId || "chat-session-" + Math.floor(Math.random() * 100000);
    if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });
    const turnCount = history ? history.length : 0;
    const escalationCheck = checkEscalation(message, turnCount);

    if (escalationCheck.trigger) {
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
          reference: refNum, created_at: new Date().toISOString(), locale, channel: "chat", name: "Passenger", email: "pending@visa.com", phone: null, inquiry_type: "ticketing", route_or_dest: "Nairobi", travel_date: null, passengers: 1, summary, status: "new", after_hours: isAfterHours || false, escalated: true, escalation_reason: escalationCheck.reason, assigned_office: office, raw_session_id: sessionId
        }])
        .select().single();

      if (inqError) throw inqError;

      await supabase.from("conversations").insert([{ inquiry_id: inquiry.id, created_at: new Date().toISOString(), role: "user", content: message, locale }]);
      const responseFR = `Votre demande concernant "${summary}" a été transmise. Référence dossier : **${refNum}**.`;
      const responseEN = `Your inquiry regarding "${summary}" has been routed to our agents. File reference: **${refNum}**.`;
      const responseText = locale === "fr" ? responseFR : responseEN;

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
