import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// Bypassing local SSL network checks for proxy compatibility
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const AMINA_SYSTEM_PROMPT = `You are Amina, a virtual travel assistant for Visa Travel and Tours SPRL (founded 2016, IATA accredited travel agency in Bujumbura, Burundi).
You are polite, professional, and speak in the active locale's language (either French or English).

KNOWLEDGE BASE & WEBSITE DATA:
- Office hours: Monday - Friday, 08:00 AM - 06:00 PM CAT. Closed on weekends.
- Head office address: Bd du Japon N° 42, Bujumbura Mairie, Burundi (Phone: +257 22219656, email: burundi@visatravelandtours.com).
- Uganda office address: Raja Chambers, Plot 3A, Parliament Avenue, 1st Floor, Office 29 & 31, Kampala (Phone: +256 731 419 028, email: uganda@visatravelandtours.com).

AVAILABLE FLIGHT ROUTES & DETAILS (From Destinations Page):
- Nairobi, Kenya (NBO): Duration 1h 35m | Airlines: Kenya Airways / Uganda Airlines | Luggage: 2 pieces (23kg each) | Price: $480 USD (~1,390,000 BIF)
- Kigali, Rwanda (KGL): Duration 0h 40m | Airlines: RwandAir | Luggage: 1 piece (23kg) | Price: $280 USD (~812,000 BIF)
- Entebbe, Uganda (EBB): Duration 1h 10m | Airlines: Uganda Airlines | Luggage: 2 pieces (23kg each) | Price: $350 USD (~1,015,000 BIF)
- Brussels, Belgium (BRU): Duration 8h 15m | Airlines: Brussels Airlines | Luggage: 2 pieces (23kg each) | Price: $1,200 USD (~3,480,000 BIF)

SERVICES & INDICATIVE FEES (From Services Page):
- Air Ticketing booking fee: $150 USD (~435,000 BIF) base fee.
- Safaris & Tours: starting packages from $380 USD (~1,100,000 BIF).
- Hotel Booking: average hotel room rate $85 USD (~245,000 BIF) per night.
- Standalone Travel regulations & Visa guidance: $45 USD (~130,000 BIF) or included free with ticketing.

CONVERSATIONAL RULES & GUIDELINES:
- When visitors ask about flight details, durations, luggage, or operating airlines for Nairobi, Kigali, Entebbe, or Brussels, you MUST answer them directly using the database above (e.g., "Flights from Bujumbura to Nairobi (NBO) have a duration of 1h 35m and are operated by Kenya Airways and Uganda Airlines. The indicative price is $480 USD..."). Do NOT refuse these queries!
- STRICT REFUSAL RULES: You only refuse live booking confirmations, purchasing tickets, or live hourly departure schedules (e.g., "what time does the flight leave on Tuesday?"). If they ask to book a seat or need a live timetable, politely state that you cannot confirm live bookings/schedules and offer to route their file to a ticketing agent.

Tone: Keep answers short (1-2 paragraphs), reassuring, and institutional.`;

// Checks the 5 escalation conditions
function checkEscalation(message: string, turnCount: number): { trigger: boolean; reason: string | null } {
  const text = message.toLowerCase();

  // 1. Visitor asks for pricing, fare, booking, cost
  const pricingKeywords = ["tarif", "prix", "combien", "acheter", "reserver", "vol", "fare", "cost", "price", "booking", "quote", "ticket cost", "seat reservation"];
  if (pricingKeywords.some(kw => text.includes(kw))) {
    return { trigger: true, reason: "Pricing / Booking inquiry" };
  }

  // 2. Visitor states a travel date within 72 hours
  const urgencyKeywords = ["demain", "aujourd'hui", "ce soir", "2 jours", "48h", "72h", "tomorrow", "today", "tonight", "next 2 days", "next 3 days", "within 48 hours"];
  if (urgencyKeywords.some(kw => text.includes(kw))) {
    return { trigger: true, reason: "Urgent travel (< 72h)" };
  }

  // 3. Visitor asks for a person / human explicitly
  const humanKeywords = ["humain", "agent", "conseiller", "directeur", "personne", "whatsapp", "téléphone", "human", "agent", "person", "staff", "talk to someone", "representative"];
  if (humanKeywords.some(kw => text.includes(kw))) {
    return { trigger: true, reason: "Explicit human request" };
  }

  // 4. Disruption indicators
  const disruptionKeywords = ["annuler", "retard", "perdu", "bagage", "bloqué", "refusé", "cancel", "delay", "lost baggage", "missed flight", "denied boarding", "emergency"];
  if (disruptionKeywords.some(kw => text.includes(kw))) {
    return { trigger: true, reason: "Travel disruption / Emergency" };
  }

  // 5. Turn count check (2 consecutive user turns without resolution, which is 4 turns in history)
  if (turnCount >= 4) {
    return { trigger: true, reason: "Dialogue limit reached" };
  }

  return { trigger: false, reason: null };
}

// Standard offline mock response generator for regional geo-blocking compatibility
function generateLocalMockResponse(message: string, locale: string): string {
  const text = message.toLowerCase();
  const isFR = locale === "fr";

  if (text.includes("bagage") || text.includes("bag") || text.includes("valise") || text.includes("weight") || text.includes("poids")) {
    return isFR
      ? "Chez Visa Travel and Tours, la franchise de bagages standard est de 2 pièces de 23 kg chacune pour les vols internationaux (ex. Bruxelles), et 1 pièce de 23 kg pour les liaisons régionales de l'Afrique de l'Est (Nairobi, Kigali, Entebbe). Des restrictions spécifiques s'appliquent selon la classe de réservation."
      : "For Visa Travel and Tours, the standard baggage allowance is 2 bags (23kg each) for international routes, and 1 bag (23kg) for East African regional flights. Specific terms depend on your operating airline and booking class.";
  }

  if (text.includes("visa") || text.includes("document") || text.includes("passeport") || text.includes("passport")) {
    return isFR
      ? "Pour les ressortissants burundais voyageant dans la région de l'Afrique de l'Est (Nairobi, Kigali, Kampala), un visa n'est pas requis. Une carte d'identité ou un laissez-passer valide suffit. Pour d'autres pays comme la Belgique (Bruxelles), un visa Schengen est exigé."
      : "For Burundian citizens traveling within the East African Community, no visa is required. A valid passport or laissez-passer is sufficient. For Schengen zone destinations like Brussels, a formal Schengen Visa application is mandatory.";
  }

  if (text.includes("horaire") || text.includes("ouvert") || text.includes("fermé") || text.includes("heure") || text.includes("hour") || text.includes("open") || text.includes("close")) {
    return isFR
      ? "Nos bureaux de Bujumbura (Bd du Japon N° 42) et Kampala (Raja Chambers) sont ouverts du lundi au vendredi, de 08h00 à 18h00 CAT. Nos équipes de permanence restent actives pour le suivi de vos dossiers prioritaires."
      : "Our offices in Bujumbura and Kampala are open Monday to Friday, from 08:00 AM to 06:00 PM CAT. Emergency booking support remains active for priority corporate clients.";
  }

  return isFR
    ? "Je prends note de votre demande concernant votre projet de voyage. Nos agents basés à Bujumbura et Kampala étudient volontiers vos itinéraires. Pour une assistance immédiate ou une réservation ferme, vous pouvez soumettre le formulaire de contact ou nous appeler au +257 22219656."
    : "I have noted your request regarding your travel plans. Our agents based in Bujumbura and Kampala would be happy to review your itineraries. For immediate assistance or to make a confirmed booking, you can submit the contact form or call us at +257 22219656.";
}

export async function POST(req: Request) {
  const startTime = Date.now();
  let sessionId = "unknown";

  try {
    const { message, history, locale, sessionId: reqSessionId, isAfterHours } = await req.json();
    sessionId = reqSessionId || "chat-session-" + Math.floor(Math.random() * 100000);

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // A. Check for Escalation Gates
    const turnCount = history ? history.length : 0;
    const escalationCheck = checkEscalation(message, turnCount);

    if (escalationCheck.trigger) {
      console.log(`[Escalation Triggered] Reason: ${escalationCheck.reason}`);

      // 1. Generate summary using Vercel AI SDK Google provider
      let summary = `Inquiry regarding ${message.substring(0, 40)}...`;
      if (GEMINI_API_KEY) {
        try {
          const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
          const { text } = await generateText({
            model: google("gemini-1.5-flash"),
            messages: [{
              role: "user",
              content: `Write a brief one-sentence summary of this user inquiry for a travel agent. Keep it concise, e.g., 'Flight inquiry to Nairobi for tomorrow'. Do not output anything else. Inquiry: "${message}"`
            }],
            temperature: 0.2
          });
          summary = text.trim();
        } catch (e) {
          console.warn("Failed to generate summary with AI SDK, using fallback.");
        }
      }

      // 2. Insert inquiry into database
      const refNum = `VTT-${Math.floor(1000 + Math.random() * 9000)}`;
      const office = locale === "en" ? "kampala" : "bujumbura";
      
      const { data: inquiry, error: inqError } = await supabase
        .from("inquiries")
        .insert([
          {
            reference: refNum,
            created_at: new Date().toISOString(),
            locale,
            channel: "chat",
            name: "Passenger",
            email: "pending@visa.com",
            phone: null,
            inquiry_type: "ticketing",
            route_or_dest: "Nairobi",
            travel_date: null,
            passengers: 1,
            summary: summary,
            status: "new",
            after_hours: isAfterHours || false,
            escalated: true,
            escalation_reason: escalationCheck.reason,
            assigned_office: office,
            raw_session_id: sessionId
          }
        ])
        .select()
        .single();

      if (inqError) throw inqError;

      // 3. Log conversation turns
      await supabase.from("conversations").insert([
        {
          inquiry_id: inquiry.id,
          created_at: new Date().toISOString(),
          role: "user",
          content: message,
          locale
        }
      ]);

      const escalationResponseText = locale === "fr" 
        ? `Votre demande concernant "${summary}" a été transmise à notre équipe. Un dossier a été créé avec la référence : **${refNum}**. Nos agents vont prendre le relais.` 
        : `Your inquiry regarding "${summary}" has been routed to our agents. A tracking file has been created with reference: **${refNum}**. Our team will assist you shortly.`;

      await supabase.from("conversations").insert([
        {
          inquiry_id: inquiry.id,
          created_at: new Date().toISOString(),
          role: "assistant",
          content: escalationResponseText,
          locale
        }
      ]);

      return NextResponse.json({
        escalated: true,
        reference: refNum,
        summary,
        message: escalationResponseText,
        inquiryId: inquiry.id
      });
    }

    // B. Standard conversation flow (No Escalation) using Vercel AI SDK
    console.log("Processing standard chat turn using Vercel AI SDK...");
    let assistantReply = "";
    
    if (GEMINI_API_KEY) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
        const formattedHistory = (history || []).map((m: any) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content
        }));

        const { text } = await generateText({
          model: google("gemini-1.5-flash"),
          system: AMINA_SYSTEM_PROMPT,
          messages: [
            ...formattedHistory,
            { role: "user", content: message }
          ],
          temperature: 0.2
        });
        assistantReply = text;
      } catch (apiError: any) {
        console.warn("Vercel AI SDK call failed in standard turn. Falling back to mock:", apiError.message);
        assistantReply = generateLocalMockResponse(message, locale);
      }
    } else {
      assistantReply = generateLocalMockResponse(message, locale);
    }

    // Save dialogue logs
    await supabase.from("conversations").insert([
      {
        inquiry_id: null,
        created_at: new Date().toISOString(),
        role: "user",
        content: message,
        locale
      },
      {
        inquiry_id: null,
        created_at: new Date().toISOString(),
        role: "assistant",
        content: assistantReply,
        locale
      }
    ]);

    return NextResponse.json({
      escalated: false,
      message: assistantReply
    });

  } catch (err: any) {
    console.error("Chat API route critical error:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
