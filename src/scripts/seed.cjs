const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

// Bypassing local SSL network checks
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase URL/Key. Make sure .env.local is populated.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const firstNames = ["Jean-Claude", "Aline", "Thierry", "Chantal", "Pierre", "Sandra", "Fidèle", "Divine", "Prosper", "Clara", "Eric", "Florence", "Moses", "Sarah", "Alex", "Grace", "Ronald", "Peace", "Arthur", "Anita"];
const lastNames = ["Nkurunziza", "Nduwimana", "Ndayishimiye", "Bukuru", "Niragira", "Manirakiza", "Hakizimana", "Irakoze", "Mugisha", "Niyongere", "Namubiru", "Kavuma", "Opolot", "Mukasa", "Mbabazi", "Mugisha", "Nsubuga", "Akello"];
const destinations = ["Nairobi (NBO)", "Kigali (KGL)", "Entebbe (EBB)", "Bruxelles (BRU)", "Dar es Salaam (DAR)", "Paris (CDG)"];
const serviceTypes = ["ticketing", "tour", "hotel", "visa_docs", "other"];
const statuses = ["new", "acknowledged", "assigned", "resolved"];
const offices = ["bujumbura", "kampala"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateInquiries() {
  const inquiries = [];
  const now = new Date();
  
  for (let i = 1; i <= 35; i++) {
    // Generate a timestamp within the last 30 days
    const createdDate = new Date();
    createdDate.setDate(now.getDate() - Math.floor(Math.random() * 30));
    
    // Distribute hours: 40% chance of after hours (outside 8am-6pm or weekends)
    const isWeekend = createdDate.getDay() === 0 || createdDate.getDay() === 6;
    let hour = 8 + Math.floor(Math.random() * 10); // Default 08:00 - 18:00
    if (Math.random() < 0.4 || isWeekend) {
      // Force after hours
      if (Math.random() < 0.5) {
        hour = Math.floor(Math.random() * 8); // 00:00 - 07:00
      } else {
        hour = 18 + Math.floor(Math.random() * 6); // 18:00 - 23:00
      }
    }
    createdDate.setHours(hour);
    createdDate.setMinutes(Math.floor(Math.random() * 60));
    createdDate.setSeconds(0);

    const isAfterHours = isWeekend || hour < 8 || hour >= 18;
    const name = `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`;
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    const phone = Math.random() < 0.8 ? `+257 ${70000000 + Math.floor(Math.random() * 9999999)}` : null;
    const type = getRandomItem(serviceTypes);
    const dest = type === "hotel" || type === "other" ? null : getRandomItem(destinations);
    const office = getRandomItem(offices);
    const refNum = 1000 + i;
    const isEscalated = Math.random() < 0.5 && type !== "other";

    // Set dates in Bujumbura CAT time zone
    const createdStr = createdDate.toISOString();
    
    // Future travel date
    const travelDate = new Date();
    travelDate.setDate(now.getDate() + 5 + Math.floor(Math.random() * 20));

    inquiries.push({
      reference: `VTT-${refNum}`,
      created_at: createdStr,
      locale: Math.random() < 0.75 ? "fr" : "en",
      channel: Math.random() < 0.6 ? "chat" : "form",
      name,
      email,
      phone,
      inquiry_type: type,
      route_or_dest: dest,
      travel_date: type === "other" ? null : travelDate.toISOString().split("T")[0],
      passengers: type === "other" ? null : 1 + Math.floor(Math.random() * 4),
      summary: generateSummary(type, dest, name),
      status: getRandomItem(statuses),
      after_hours: isAfterHours,
      escalated: isEscalated,
      escalation_reason: isEscalated ? getRandomItem(["Pricing confirmation requested", "Close travel date (< 72h)", "Explicit human agent requested"]) : null,
      first_response_ms: Math.floor(60000 + Math.random() * 300000), // 1-5 minutes response time
      assigned_office: office,
      raw_session_id: `session-${refNum}`
    });
  }

  return inquiries;
}

function generateSummary(type, dest, name) {
  const summaries = {
    ticketing: `Demande de réservation de vol pour ${dest || "Destination"} pour le client ${name}.`,
    tour: `Demande d'information sur les forfaits touristiques régionaux vers ${dest || "Afrique de l'Est"}.`,
    hotel: `Recherche d'hébergement hôtelier pour un voyage d'affaires de ${name}.`,
    visa_docs: `Questions réglementaires sur les bagages et exigences de visa de transit.`,
    other: `Demande de contact générale pour assistance personnalisée.`
  };
  return summaries[type] || "Demande de voyage.";
}

function generateConversations(inquiryId, inquiry) {
  const isFR = inquiry.locale === "fr";
  const messages = [];

  if (isFR) {
    messages.push(
      { role: "assistant", content: "Bonjour ! Je suis Amina, l'assistante virtuelle de Visa Travel and Tours. Comment puis-je vous aider pour vos préparatifs de voyage aujourd'hui ?" },
      { role: "user", content: `Je voudrais des informations pour un voyage vers ${inquiry.route_or_dest || "Nairobi"}.` }
    );

    if (inquiry.inquiry_type === "ticketing") {
      messages.push(
        { role: "assistant", content: "Parfait ! Pour vous donner les meilleures options de vol, pouvez-vous me préciser vos dates de départ et le nombre de passagers ?" },
        { role: "user", content: `Je prévois de partir le ${inquiry.travel_date} avec ${inquiry.passengers} passagers.` },
        { role: "assistant", content: "Très bien, j'ai noté ces informations. Je ne peux pas émettre de tarifs fermes ou confirmer des sièges en temps réel, mais je transmets immédiatement votre dossier de billetterie à l'un de nos agents pour une cotation détaillée." }
      );
    } else if (inquiry.inquiry_type === "visa_docs") {
      messages.push(
        { role: "assistant", content: "Absolument. Pouvez-vous me dire pour quelle nationalité de passeport vous souhaitez vérifier les exigences ?" },
        { role: "user", content: "Passeport burundais s'il vous plaît." },
        { role: "assistant", content: "Compris. Pour les citoyens burundais voyageant vers l'Afrique de l'Est, un visa n'est pas requis mais un laissez-passer ou passeport valide est indispensable. Je transmets vos détails à notre spécialiste visa pour confirmation finale." }
      );
    } else {
      messages.push(
        { role: "assistant", content: "Je comprends tout à fait. Je transmets votre demande à notre équipe pour qu'un agent vous contacte directement avec les tarifs exacts." }
      );
    }
  } else {
    // EN
    messages.push(
      { role: "assistant", content: "Hello! I am Amina, the virtual assistant for Visa Travel and Tours. How can I help you with your travel planning today?" },
      { role: "user", content: `I would like to inquire about a flight to ${inquiry.route_or_dest || "Nairobi"}.` }
    );

    if (inquiry.inquiry_type === "ticketing") {
      messages.push(
        { role: "assistant", content: "Great! To search for the best flight connections, could you tell me your departure date and how many passengers?" },
        { role: "user", content: `I plan to leave on ${inquiry.travel_date} for ${inquiry.passengers} travelers.` },
        { role: "assistant", content: "Thank you. I have logged these details. While I cannot confirm live seat availability or fares directly, I have routed your ticket request to our office agent for a prompt quote." }
      );
    } else {
      messages.push(
        { role: "assistant", content: "Understood. I am forwarding your request details to our agents to get back to you with custom options." }
      );
    }
  }

  return messages.map((m, idx) => {
    // Offset conversation turns by 10s intervals
    const t = new Date(inquiry.created_at);
    t.setSeconds(t.getSeconds() + (idx * 15));
    return {
      inquiry_id: inquiryId,
      created_at: t.toISOString(),
      role: m.role,
      content: m.content,
      locale: inquiry.locale
    };
  });
}

async function seed() {
  console.log("Cleaning database tables...");
  
  // Clean tables
  await supabase.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("inquiries").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("Generating seed inquiries...");
  const mockInquiries = generateInquiries();

  console.log(`Inserting ${mockInquiries.length} inquiries into public.inquiries...`);
  
  for (const inquiry of mockInquiries) {
    const { data: inserted, error: inqErr } = await supabase
      .from("inquiries")
      .insert([inquiry])
      .select()
      .single();

    if (inqErr) {
      console.error(`Failed to insert inquiry ${inquiry.reference}:`, inqErr);
      continue;
    }

    // Insert conversations for chat channels
    if (inquiry.channel === "chat") {
      const chatTurns = generateConversations(inserted.id, inquiry);
      const { error: convErr } = await supabase
        .from("conversations")
        .insert(chatTurns);

      if (convErr) {
        console.error(`Failed to insert chat history for ${inquiry.reference}:`, convErr);
      }
    }
  }

  console.log("\nDatabase successfully seeded!");
  process.exit(0);
}

seed();
