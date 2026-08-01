import { NextResponse as Res } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI as ai } from "@ai-sdk/google";
import { generateText } from "ai";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
const key = process.env.GEMINI_API_KEY || "";

const extractSys = `Analyze chat. Output JSON only. Keys:
- "esc": true if request is for booking, price quote, flight ticket, seat availability, travel date <72h, disruptions (missed flight, lost bag), or human agent.
- "service": "ticketing", "tour", "hotel", "visa", "disruption", or null.
- "route": destination/route or null.
- "date": travel date or null.
- "pax": passengers (integer) or null.
- "contact": phone/email or null.
- "refused": true if user refused to share contact.`;

const qualifySys = (missing: string[], isAfter: boolean) => `You are Amina, virtual travel assistant.
The request has escalated. Warmly acknowledge user's last input, state that live fares/availability sit in Amadeus with our agents, and ask for these missing details ONE at a time: ${missing.join(", ")}.
Rules:
- Be warm and brief (2-3 sentences max).
- NEVER state fares, schedules, visa fees, or availability.
${isAfter ? "- Mention offices are closed but you are recording this for first thing in the morning." : ""}`;

const AMINA_PROMPT = `You are Amina, travel assistant for Visa Travel and Tours (Bujumbura +25722219656, Bd du Japon N42; Kampala +256731419028, Raja Chambers. Hours: Mon-Fri 8-18 CAT).
Rules:
- Tier A (Answer directly): Contacts, office locations, hours, GDS, services (ticketing, tours, hotels).
- Tier B (Careful! No figures, explain process, hand off): Visas, fares, schedules, baggage, penalties.
- Tone: Brief (2-3 sentences). Match language (FR/EN). No pricing/booking.`;

export async function POST(req: Request) {
  try {
    const { message: msg, history: hist, locale, sessionId: sid, isAfterHours: ah } = await req.json();
    const isFR = locale === "fr", count = hist ? hist.length : 0;
    if (!key) return Res.json({ error: "Key missing" }, { status: 500 });
    const google = ai({ apiKey: key });

    const chatLog = [...(hist || []).map((m: any) => `${m.role}: ${m.content}`), `user: ${msg}`].join("\n");
    const { text: extractText } = await generateText({
      model: google("gemini-1.5-flash"),
      system: extractSys,
      messages: [{ role: "user", content: `Analyze:\n${chatLog}` }],
      temperature: 0.1
    });

    const data = JSON.parse(extractText.replace(/```json/gi, "").replace(/```/g, "").trim());
    const previouslyEscalated = (hist || []).some((m: any) => m.isEscalationCard);
    const escalated = data.esc || (count >= 4) || previouslyEscalated;

    if (escalated) {
      const missing: string[] = [];
      const isUrgent = data.date && (data.date.toLowerCase().includes("today") || data.date.toLowerCase().includes("demain") || data.date.toLowerCase().includes("now") || data.date.toLowerCase().includes("urgent"));
      
      if (!data.route && data.service !== "disruption") missing.push("route/destination");
      if (!data.date && !isUrgent) missing.push("travel dates");
      if (!data.pax && !isUrgent) missing.push("passenger count");
      if (!data.contact) missing.push("contact info (phone or email)");

      const isReady = (data.route || data.service === "disruption") && (data.contact || data.refused);

      if (isReady) {
        const ref = `VTT-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: inq, error } = await db.from("inquiries").insert([{
          reference: ref, locale, channel: "chat", name: "Passenger",
          email: data.contact?.includes("@") ? data.contact : null,
          phone: data.contact?.includes("@") ? null : data.contact,
          inquiry_type: data.service || "ticketing",
          route_or_dest: data.route || "—",
          travel_date: data.date || "—",
          passengers: data.pax || 1,
          summary: msg.substring(0, 40), status: "new", after_hours: ah || false,
          escalated: true, assigned_office: isFR ? "bujumbura" : "kampala", raw_session_id: sid || "session"
        }]).select().single();
        if (error) throw error;

        await db.from("conversations").insert([{ inquiry_id: inq.id, role: "user", content: msg, locale }]);
        const reply = ah 
          ? (isFR ? "Votre demande a été enregistrée. Un agent vous contactera dès l'ouverture des bureaux à 08h00. Vos détails sont déjà transmis." : "Your inquiry has been recorded. An agent will contact you when our offices open at 08:00. Your details are already attached.")
          : (isFR ? "C'est noté. Votre demande a été transmise en priorité à nos agents. Un conseiller va prendre le relais avec vos informations." : "Understood. Your request has been sent to our agents with priority. An agent is picking this up now with your details attached.");

        await db.from("conversations").insert([{ inquiry_id: inq.id, role: "assistant", content: reply, locale }]);
        return Res.json({ escalated: true, reference: ref, summary: `Inquiry to ${data.route || "—"}`, message: reply, inquiryId: inq.id });
      } else {
        const { text: qualifyReply } = await generateText({
          model: google("gemini-1.5-flash"),
          system: qualifySys(missing, ah),
          messages: [...(hist || []).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })), { role: "user", content: msg }],
          temperature: 0.2
        });
        return Res.json({ escalated: false, message: qualifyReply });
      }
    }

    const historyMsgs = (hist || []).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
    const afterHoursPrefix = ah ? (isFR ? "Bonsoir. Nos bureaux sont actuellement fermés, mais votre message est enregistré et un agent vous répondra à la réouverture. Comment puis-je vous aider en attendant? " : "Good evening. Our offices are closed at the moment, but your message is being recorded now and an agent will respond when we reopen. How can I help in the meantime? ") : "";
    
    const { text: normalReply } = await generateText({
      model: google("gemini-1.5-flash"),
      system: AMINA_PROMPT,
      messages: [...historyMsgs, { role: "user", content: msg }],
      temperature: 0.2
    });

    const reply = (count === 0 && ah) ? (afterHoursPrefix + normalReply) : normalReply;
    await db.from("conversations").insert([{ inquiry_id: null, role: "user", content: msg, locale }, { inquiry_id: null, role: "assistant", content: reply, locale }]);
    return Res.json({ escalated: false, message: reply });
  } catch (err: any) { return Res.json({ error: err.message }, { status: 500 }); }
}
