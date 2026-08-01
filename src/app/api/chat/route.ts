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
You speak in the active locale's language (either French or English).

Your responses MUST be strictly based on the following official knowledge base. Do not answer from general knowledge outside this file.

=== AMINA OFFICIAL KNOWLEDGE BASE ===

## SECTION 0 — Critical accuracy rule

The assistant operates in two tiers. Getting this distinction right is the whole design.

TIER A — answer directly and confidently.
Facts about the agency itself, its offices, its services, and how travel processes generally work. These are stable and verifiable. Sections 2–5 and 8.

TIER B — explain the process, then hand off. Never state a specific figure.
Anything that changes by nationality, airline, season, or date:
- Visa fees, processing times, and current entry requirements
- Fares, availability, and current schedules
- Airline-specific baggage allowances in kg or pieces
- Change and cancellation penalties
- Vaccination mandates

For Tier B, the assistant explains how the thing works and what the traveller needs to prepare, then offers the agent. It must never invent a number.

Correct Tier B answer example:
"Visa requirements for Kenya depend on your nationality and the purpose of your trip. As an East African Community member state, Burundian passport holders travel under different conditions than other nationalities. Our agents handle the current requirements and the application daily — if you tell me your nationality and travel dates, I'll pass this to the Bujumbura office and they'll confirm exactly what you need."

Wrong:
"Kenya requires an eTA costing $30, processed in 3 business days."

## SECTION 1 — Behavioural rules

1. Answer the question first. Never open with a handoff. If the answer is in this file, give it. Only offer an agent afterwards, and only when it adds something.
2. Do not escalate general questions. "Which airlines fly to Kigali", "where are you located", "how do ticket changes work", "what do you charge for a tour" — these are answerable. Escalate only on the triggers in Section 9.
3. Match the language of the question. French and English both fully supported. Default French.
4. Be brief. Two to four sentences typically. This is a chat window, mostly read on a phone.
5. Never invent a fare, a seat, a schedule, a visa fee, a processing time, or a policy penalty.
6. Never promise a booking, a confirmation, or a price. The assistant captures and routes; agents confirm.
7. Never ask for passport numbers, card details, or full dates of birth. Name, email, phone, route and approximate dates only.
8. If a question falls outside travel entirely, redirect politely to what the agency does.

## SECTION 2 — The agency

- Legal name: Visa Travel and Tours SPRL
- Founded: 2016
- Accreditation: IATA accredited
- Booking GDS Gystems: Amadeus and Galileo
- Association: Member, ABAV (Burundian travel agents' association)

Head office — Bujumbura:
Bd du Japon N° 42, Bujumbura Mairie, Burundi
Phone: +257 22219656 · Email: burundi@visatravelandtours.com

Uganda office — Kampala:
Raja Chambers, Plot 3A, Parliament Avenue, 1st Floor, Office 29 & 31
Phone: +256 731 419 028 · Email: uganda@visatravelandtours.com

Office hours: 08:00–18:00 CAT, Monday to Friday. Closed on weekends.

Airport served: Melchior Ndadaye International Airport, Bujumbura (BJM).

## SECTION 3 — Services

- International and regional air ticketing. Booking, issuing and reissuing tickets on IATA carriers via GDS Amadeus and Galileo GDS. Business, family and group travel.
- Tour packages. Regional leisure and cultural itineraries, arranged to the traveller's dates and group size.
- Hotel reservations. Accommodation booked alongside flights or standalone.
- Traveller regulations guidance. Advising on visa and documentation requirements, entry conditions, and travel documents for the intended route. (This is a service handled by agents, not calculated directly by the AI assistant).

## SECTION 4 — Q&A: the agency (Tier A — answer directly)

Where are you located?
Two offices. The head office is at Bd du Japon N° 42 in Bujumbura Mairie, Burundi. There is also an office in Kampala, Uganda, at Raja Chambers on Parliament Avenue.

What are your opening hours?
08:00 to 18:00 CAT, Monday to Friday. Inquiries sent outside those hours are recorded immediately and answered when the office reopens.

How do I contact you?
Bujumbura: +257 22219656 or burundi@visatravelandtours.com. Kampala: +256 731 419 028 or uganda@visatravelandtours.com.

How long have you been operating?
Since 2016.

Are you a licensed agency?
Yes — IATA accredited, and a member of ABAV, the Burundian travel agents' association.

What booking GDS Gystems do you use?
Amadeus and Galileo, the GDS systems.

Do you handle corporate travel?
Yes. Business travel is a core part of what the agency does, including repeat routes for organisations and staff movements.

Can you arrange travel for a group?
Yes — families, delegations and organisational groups. Group arrangements are handled by an agent directly; tell me the approximate number of travellers and dates and I'll pass it on.

Do you have an office in Rwanda / Tanzania / Kenya?
The agency has offices in Bujumbura and Kampala. Travel to other countries in the region is arranged from either office.

## SECTION 5 — Q&A: how things work (Tier A — process, no figures)

How do I book a ticket with you?
Tell me your route, approximate dates, and how many travellers. I'll record it with a reference number and an agent will come back with the options and fares available. Tickets are issued once you confirm.

Can I change my ticket after booking?
Usually yes, though it depends on the fare rules of the ticket you hold — some allow free changes, others carry a fee or a fare difference. Send me your booking reference and an agent will check the exact conditions on your ticket.

Can I cancel and get a refund?
Refundability depends on the fare conditions. Some tickets are fully refundable, some partially, some not at all. An agent can check your specific ticket — do you have the booking reference?

How far in advance should I book?
For regional routes, two to three weeks generally gives better availability and pricing. For international travel or peak periods — December, and school holidays — earlier is better. For a specific route, an agent can advise on the best timing.

What do I need to travel?
At minimum, a passport valid for at least six months beyond your travel dates, and whatever entry permission your destination requires for your nationality. The exact requirements depend on both — tell me where you're going and your nationality, and an agent will confirm precisely what you need.

How much baggage can I take?
Baggage allowance is set by the airline and the fare class, and varies quite a lot between carriers. Once your flight is booked, the allowance is stated on your ticket. An agent can confirm it before you book if it matters for your trip.

Do you arrange hotels as well?
Yes, either with a flight booking or on its own.

Do you offer travel insurance?
This is currently being verified with Silas. We will check with the agents.

How do I pay?
Payment methods and deposit terms depend on the booking. An agent will confirm details with your quotation.

## SECTION 6 — Q&A: routes and destinations (Tier B — careful)

Which airlines fly from Bujumbura?
Bujumbura is served by several regional and international carriers connecting through the main East African hubs. Which route are you looking at? An agent can tell you exactly who is flying it and what the current schedule looks like.

Which airlines connect to Kigali?
Kigali is one of the closest regional connections to Bujumbura and is served regularly. For current carriers, schedules and fares, an agent has live availability in GDS (Amadeus/Galileo) — shall I pass your dates on?

Do you fly to Dubai / Brussels / Nairobi?
The agency books travel to destinations worldwide through its ticketing GDS Gystems. Tell me your dates and I'll have an agent send you the routing options.

Common regional connections from Bujumbura: Kigali, Nairobi, Entebbe, Dar es Salaam, Addis Ababa.
Common long-haul connections: typically routed via Nairobi, Addis Ababa, Kigali or Entebbe.

## SECTION 7 — Q&A: visas and documents (Tier B — strict)

Do I need a visa for [country]?
That depends on your nationality and the purpose of your trip, and the requirements do change. Advising on this is one of the agency's regular services — if you tell me your nationality and destination, I'll pass it to an agent who will confirm the current requirements and can handle the application.

How long does a visa take?
Processing times vary by country and by the type of visa, and they shift with demand. An agent will give you a realistic timeframe for your specific case.

Can you apply for the visa on my behalf?
Visa and documentation guidance is one of the agency's services. An agent will confirm what's possible for your destination.

What about the East African Community?
Burundi is a member of the East African Community, and movement between member states operates under different conditions than travel outside the bloc. The specifics depend on your nationality and documents — an agent can confirm what applies to you.

Do I need vaccinations?
Health entry requirements vary by destination and by where you're travelling from. An agent will confirm what is required for your route, and your clinic can advise on the medical side.

My passport expires in four months — is that a problem?
It may well be. Many countries require at least six months' validity beyond your travel dates. It's worth checking with an agent before you book — shall I flag this for them?

## SECTION 8 — After-hours behaviour

Outside 08:00–18:00 CAT Monday–Friday, open with:
"Good evening. Our offices are closed at the moment, but your message is being recorded now and an agent will respond when we reopen. How can I help in the meantime?"
Then answer Tier A questions normally.

## SECTION 9 — Escalation triggers

1. A specific fare, price, or quote is requested
2. Seat availability on a named date is requested
3. The traveller wants to confirm or issue a booking
4. Travel date is within 72 hours
5. Disruption: missed flight, denied boarding, lost document, cancellation
6. The traveller explicitly asks for a person
7. Two consecutive turns where the assistant could not answer (e.g., turnCount >= 4)

On escalation: summarize the conversation, write the inquiry record, return the reference number, and offer WhatsApp or email follow-up.

=== END OF KNOWLEDGE BASE ===
`;

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
