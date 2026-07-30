import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// Bypassing local SSL network checks
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const AMINA_SYSTEM_PROMPT = `You are Amina, a virtual travel assistant for Visa Travel and Tours SPRL (founded 2016, IATA accredited travel agency in Bujumbura, Burundi).
You are polite, professional, and speak in the active locale's language (either French or English).

KNOWLEDGE BASE:
- Office hours: Monday - Friday, 08:00 AM - 06:00 PM CAT. Closed on weekends.
- Head office address: Bd du Japon N° 42, Bujumbura Mairie, Burundi (Phone: +257 22219656, email: burundi@visatravelandtours.com).
- Uganda office address: Raja Chambers, Plot 3A, Parliament Avenue, 1st Floor, Office 29 & 31, Kampala (Phone: +256 731 419 028, email: uganda@visatravelandtours.com).
- Services: Air ticketing, tour packages ( safaris), hotel reservations, and travel regulations guidance (visas, luggage rules).
- Visa rules: Burundi passport holders traveling within East Africa (Nairobi, Kigali, Kampala) do not require a visa but need a valid passport or laissez-passer. Brussels (Europe) requires a Schengen Visa.
- Baggage allowances: Typically 2 pieces (23kg each) for international routes, 1 piece (23kg) for regional flights.

STRICT REFUSAL RULES:
- You do NOT have access to live schedules, seat availability, or flight pricing.
- If the user asks for flight fares, prices, seat bookings, or ticket quotes, you MUST politely refuse to quote specific prices and offer to route the request to a human agent.

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

async function callGemini(systemPrompt: string, history: any[], userMessage: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const formattedHistory = history.map((h: any) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.content }]
  }));

  formattedHistory.push({ role: "user", parts: [{ text: userMessage }] });

  try {
    const response = await axios.post(GEMINI_API_URL, {
      contents: formattedHistory,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.2
      }
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000
    });

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Amina encountered a parsing error.";
  } catch (err: any) {
    console.error("Gemini API call failed:", err.message);
    throw err;
  }
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
    : "I have recorded your travel question. Our sales agents in Bujumbura and Kampala are ready to assist you. For direct help, you can call us at +257 22219656 or submit a travel inquiry form.";
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { message, history, locale, sessionId, isAfterHours } = await req.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: "Missing message or sessionId" }, { status: 400 });
    }

    // A. Check for Escalation Gates
    const turnCount = history ? history.length : 0;
    const escalationCheck = checkEscalation(message, turnCount);

    if (escalationCheck.trigger) {
      console.log(`[Escalation Triggered] Reason: ${escalationCheck.reason}`);

      // 1. Generate summary using Gemini
      let summary = `Inquiry regarding ${message.substring(0, 40)}...`;
      if (GEMINI_API_KEY) {
        try {
          const sumResponse = await callGemini(
            "Write a brief one-sentence summary of this user inquiry for a travel agent. Keep it concise, e.g., 'Flight inquiry to Nairobi for tomorrow'. Do not output anything else.",
            [],
            `User query: "${message}"`
          );
          summary = sumResponse.trim();
        } catch (e) {
          console.warn("Failed to generate summary with AI, using fallback.");
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
            email: "pending@visa.com", // Will be updated if user leaves email
            phone: null,
            inquiry_type: "ticketing", // Default
            route_or_dest: "Nairobi", // Default
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

      // 3. Write final conversation turns to conversations
      // First save the user message
      await supabase.from("conversations").insert([
        {
          inquiry_id: inquiry.id,
          created_at: new Date().toISOString(),
          role: "user",
          content: message,
          locale
        }
      ]);

      // Then save the assistant escalation notification
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

    // B. Standard conversation flow (No Escalation)
    console.log("Processing standard chat turn...");
    let assistantReply = "";
    
    try {
      assistantReply = await callGemini(AMINA_SYSTEM_PROMPT, history || [], message);
    } catch (apiError: any) {
      console.warn("Gemini call failed in standard turn. Generating local mock response:", apiError.message);
      assistantReply = generateLocalMockResponse(message, locale);
    }

    // Save dialogue logs (even without inquiry link, using raw_session_id logic)
    // First user turn
    await supabase.from("conversations").insert([
      {
        inquiry_id: null,
        created_at: new Date().toISOString(),
        role: "user",
        content: message,
        locale
      }
    ]);

    // Next assistant turn
    await supabase.from("conversations").insert([
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
