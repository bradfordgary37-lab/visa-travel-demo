"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Locale = "fr" | "en";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Locale, Record<string, string>> = {
  fr: {
    // Demo Banner
    demo_banner: "Concept de démonstration préparé pour Visa Travel and Tours · Ce site n'est pas un site de réservation réel.",
    view_dashboard: "Tableau de Bord",

    // Navigation
    nav_home: "Accueil",
    nav_services: "Services",
    nav_destinations: "Destinations",
    nav_contact: "Contact & Demande",
    nav_about: "À Propos",

    // Footer
    footer_tagline: "Votre partenaire de voyage IATA agréé de confiance à Bujumbura depuis 2016.",
    footer_offices: "Nos Bureaux",
    footer_bujumbura: "Bujumbura (Siège Social)",
    footer_kampala: "Kampala (Ouganda)",
    footer_accreditation: "Accréditations & Systèmes",
    footer_iata: "Agréé IATA",
    footer_systems: "Systèmes Amadeus & Galileo",
    footer_association: "Membre ABAV (Association des Agents de Voyage du Burundi)",
    footer_created_by: "Démonstration créée par Cerebra Lab · cerebralabhq@gmail.com",
    footer_rights: "Tous droits réservés.",

    // Home Page
    hero_title: "L'excellence du voyage d'affaires et de la billetterie régionale",
    hero_subtitle: "Visa Travel and Tours SPRL organise vos déplacements professionnels et familiaux depuis Bujumbura vers l'Afrique de l'Est et l'international avec une rigueur absolue.",
    cta_inquiry: "Faire une demande de voyage",
    cta_services: "Découvrir nos services",

    // Signature Element: Live Timeline
    timeline_title: "Flux des demandes en temps réel",
    timeline_subtitle: "Démonstration de capture instantanée 24h/24",
    timeline_status_new: "Reçu (En attente)",
    timeline_status_ack: "Confirmé par Amina",
    timeline_status_assigned: "Assigné à l'agent",
    timeline_after_hours: "Hors Horaires",
    timeline_ref: "Réf :",

    // Services Page
    services_title: "Nos Services Professionnels",
    services_subtitle: "Une gestion complète et conforme pour tous vos besoins de transport et de séjour.",
    service_ticketing_title: "Billetterie Aérienne Internationale",
    service_ticketing_desc: "Émission instantanée de billets régionaux et internationaux via Amadeus et Galileo. Optimisation des itinéraires pour les voyages d'affaires.",
    service_tours_title: "Forfaits Touristiques & Voyages",
    service_tours_desc: "Organisation de voyages sur mesure et de séjours guidés en Afrique de l'Est et dans le monde.",
    service_hotels_title: "Réservations d'Hôtels",
    service_hotels_desc: "Accès à des tarifs préférentiels auprès de chaînes hôtelières partenaires mondiales et régionales.",
    service_guidance_title: "Assistance Réglementaire",
    service_guidance_desc: "Conseils et suivi pour l'obtention des visas, exigences de documentation voyage, règles de bagages et protocoles sanitaires.",
    service_indicative_price: "Tarif indicatif :",

    // Destinations Page
    dest_title: "Destinations Populaires & Connexions",
    dest_subtitle: "Liaisons régulières au départ de l'Aéroport International de Bujumbura (BJM).",
    dest_nairobi_desc: "Le hub économique principal de l'Afrique de l'Est. Idéal pour les voyages d'affaires.",
    dest_kigali_desc: "Connexion rapide par voie aérienne ou terrestre. Voyages d'affaires et familiaux.",
    dest_entebbe_desc: "Accès direct au marché ougandais. Parfait pour les liaisons institutionnelles.",
    dest_brussels_desc: "La porte d'entrée principale vers l'Europe pour la communauté burundaise.",
    dest_approx: "approx.",

    // About Page
    about_title: "À Propos de Visa Travel and Tours",
    about_subtitle: "Une agence burundaise agréée IATA combinant expertise locale et outils de réservation mondiaux.",
    about_history_title: "Notre Histoire",
    about_history_desc: "Fondée en 2016 à Bujumbura, Visa Travel and Tours SPRL s'est imposée comme un acteur clé de la billetterie d'affaires au Burundi. Membre de l'ABAV, notre agence garantit des transactions transparentes et sécurisées.",
    about_office_hours: "Heures d'ouverture",
    about_weekdays: "Lundi - Vendredi : 08h00 - 18h00 CAT",
    about_weekend: "Samedi - Dimanche : Fermé (Permanence Amina active)",

    // Contact / Inquiry Form
    contact_title: "Soumettre une Demande de Voyage",
    contact_subtitle: "Complétez le formulaire ci-dessous. Notre système enregistre votre demande instantanément et vous attribue un numéro de référence.",
    form_name: "Nom complet",
    form_email: "Adresse e-mail",
    form_phone: "Téléphone (optionnel)",
    form_type: "Type de service",
    form_type_ticketing: "Billetterie Aérienne",
    form_type_tour: "Forfait Touristique / Tours",
    form_type_hotel: "Réservation d'Hôtel",
    form_type_visa: "Assistance Visa & Documents",
    form_type_other: "Autre demande",
    form_route: "Destination ou Itinéraire souhaité",
    form_date: "Date de départ prévue",
    form_passengers: "Nombre de passagers",
    form_submit: "Envoyer ma demande",
    form_submitting: "Envoi en cours...",
    form_error_required: "Ce champ est obligatoire",
    form_error_email: "Veuillez entrer une adresse e-mail valide",

    // Confirmation screen
    confirmation_title: "Votre demande a été enregistrée avec succès !",
    confirmation_ref: "Numéro de référence unique :",
    confirmation_body: "Un e-mail d'accusé de réception automatique a été généré par notre système. Un agent de notre bureau de Bujumbura ou de Kampala prendra contact avec vous dans les meilleurs délais.",
    email_preview_title: "Accusé de réception généré (Aperçu client)",
    email_preview_subject: "Visa Travel & Tours - Accusé de réception - Réf",
    email_preview_salutation: "Cher(e)",
    email_preview_text: "Nous confirmons la bonne réception de votre demande concernant votre projet de voyage. Nos agents étudient actuellement les meilleures options de tarifs et de liaisons aériennes.",
    email_preview_sla: "Notre bureau est actuellement ouvert. Un agent vous répondra sous 2 heures.",
    email_preview_sla_after_hours: "Notre bureau est actuellement fermé (heures d'ouverture : 08h00 - 18h00 CAT). Votre demande a été sécurisée dans notre système d'inscriptions après-heures et sera traitée en priorité dès l'ouverture des bureaux lundi matin.",

    // Chatbot Amina
    chat_title: "Amina - Assistante Virtuelle",
    chat_welcome: "Bonjour ! Je suis Amina, l'assistante virtuelle de Visa Travel and Tours. Comment puis-je vous aider pour vos préparatifs de voyage aujourd'hui ?",
    chat_placeholder: "Posez votre question sur les bagages, visas, horaires...",
    chat_send: "Envoyer",
    chat_escalated_title: "Demande Transmise à un Agent",
    chat_escalated_desc: "Votre demande requiert l'intervention d'un conseiller. Un dossier de référence a été créé.",
    chat_wa_continue: "Continuer sur WhatsApp",
    chat_email_leave: "Laisser mon e-mail",
    chat_wa_modal_title: "Mode Démonstration WhatsApp",
    chat_wa_modal_body: "Dans le système réel, ce bouton ouvre une discussion WhatsApp directement avec l'agent désigné, en lui collant automatiquement le résumé de la discussion et le numéro de référence. Aucun numéro n'est lié pour cette démo.",
    chat_wa_modal_message_label: "Message qui serait transmis à l'agent :",
    chat_wa_modal_close: "Fermer l'aperçu",
    chat_email_placeholder: "Entrez votre e-mail pour recevoir une réponse",
    chat_email_submit: "Soumettre",
    chat_email_success: "Merci ! Votre e-mail a été associé à la référence."
  },
  en: {
    // Demo Banner
    demo_banner: "Concept demo prepared for Visa Travel and Tours · Not a live booking site.",
    view_dashboard: "Dashboard",

    // Navigation
    nav_home: "Home",
    nav_services: "Services",
    nav_destinations: "Destinations",
    nav_contact: "Contact & Inquiry",
    nav_about: "About Us",

    // Footer
    footer_tagline: "Your trusted IATA-accredited travel partner in Bujumbura since 2016.",
    footer_offices: "Our Offices",
    footer_bujumbura: "Bujumbura (Head Office)",
    footer_kampala: "Kampala (Uganda)",
    footer_accreditation: "Accreditations & Systems",
    footer_iata: "IATA Accredited",
    footer_systems: "Amadeus & Galileo Connected",
    footer_association: "ABAV Member (Burundi Travel Agents Association)",
    footer_created_by: "Demo prepared by Cerebra Lab · cerebralabhq@gmail.com",
    footer_rights: "All rights reserved.",

    // Home Page
    hero_title: "Excellence in Corporate Travel & Regional Ticketing",
    hero_subtitle: "Visa Travel and Tours SPRL organizes your business and family travel from Bujumbura to East Africa and international destinations with absolute rigor.",
    cta_inquiry: "Make a Travel Inquiry",
    cta_services: "Explore Our Services",

    // Signature Element: Live Timeline
    timeline_title: "Real-time Inquiry Timeline",
    timeline_subtitle: "24/7 Instant Capture Demonstration",
    timeline_status_new: "Received (Pending)",
    timeline_status_ack: "Acknowledged by Amina",
    timeline_status_assigned: "Assigned to Agent",
    timeline_after_hours: "After Hours",
    timeline_ref: "Ref:",

    // Services Page
    services_title: "Our Professional Services",
    services_subtitle: "Comprehensive and compliant management for all your transport and accommodation needs.",
    service_ticketing_title: "International Air Ticketing",
    service_ticketing_desc: "Instant ticketing for regional and international flights via Amadeus and Galileo. Optimized routes tailored for corporate travel.",
    service_tours_title: "Tour Packages & Leisure",
    service_tours_desc: "Custom holiday planning and guided regional tours in East Africa and worldwide.",
    service_hotels_title: "Hotel Reservations",
    service_hotels_desc: "Preferred booking rates with global hotel networks and local regional partners.",
    service_guidance_title: "Travel Regulations & Advisory",
    service_guidance_desc: "Visa requirements counseling, documentation vetting, baggage allowances, and health protocol checks.",
    service_indicative_price: "Indicative Price:",

    // Destinations Page
    dest_title: "Popular Destinations & Routes",
    dest_subtitle: "Regular flight connections departing from Bujumbura International Airport (BJM).",
    dest_nairobi_desc: "The main economic hub of East Africa. Ideal for corporate trips.",
    dest_kigali_desc: "Quick flight or road connection. Popular for business and family visits.",
    dest_entebbe_desc: "Direct flight access to the Ugandan market. Perfect for corporate travel.",
    dest_brussels_desc: "The main European gateway for the Burundian community.",
    dest_approx: "approx.",

    // About Page
    about_title: "About Visa Travel and Tours",
    about_subtitle: "A Burundian agency combining local market expertise with global reservation channels.",
    about_history_title: "Our History",
    about_history_desc: "Founded in 2016 in Bujumbura, Visa Travel and Tours SPRL has established itself as a premier corporate ticketing agency in Burundi. As a proud member of ABAV, our agency guarantees fully secure and transparent transactions.",
    about_office_hours: "Office Hours",
    about_weekdays: "Monday - Friday: 08:00 AM - 06:00 PM CAT",
    about_weekend: "Saturday - Sunday: Closed (Virtual Agent Amina Active)",

    // Contact / Inquiry Form
    contact_title: "Submit a Travel Inquiry",
    contact_subtitle: "Fill out the travel request form below. The system automatically registers your inquiry and issues a tracking reference number.",
    form_name: "Full Name",
    form_email: "Email Address",
    form_phone: "Phone Number (optional)",
    form_type: "Service Required",
    form_type_ticketing: "Air Ticketing",
    form_type_tour: "Tour Package / Holiday",
    form_type_hotel: "Hotel Booking",
    form_type_visa: "Visa & Document Assistance",
    form_type_other: "Other Request",
    form_route: "Desired Route or Destination",
    form_date: "Planned Departure Date",
    form_passengers: "Number of Passengers",
    form_submit: "Submit Inquiry",
    form_submitting: "Submitting...",
    form_error_required: "This field is required",
    form_error_email: "Please enter a valid email address",

    // Confirmation screen
    confirmation_title: "Your travel inquiry has been successfully registered!",
    confirmation_ref: "Unique Tracking Reference:",
    confirmation_body: "An automated receipt email has been generated. An agent from our Bujumbura or Kampala office will contact you shortly.",
    email_preview_title: "Receipt Email Generated (Customer Preview)",
    email_preview_subject: "Visa Travel & Tours - Inquiry Acknowledged - Ref",
    email_preview_salutation: "Dear",
    email_preview_text: "We confirm receipt of your inquiry regarding your travel plans. Our agents are evaluating the best route connections and competitive fare options.",
    email_preview_sla: "Our offices are currently open. An agent will reply to you within 2 hours.",
    email_preview_sla_after_hours: "Our offices are currently closed (Opening hours: 08:00 AM - 06:00 PM CAT). Your inquiry is secured in our after-hours registration system and will be processed with high priority on Monday morning.",

    // Chatbot Amina
    chat_title: "Amina - Virtual Assistant",
    chat_welcome: "Hello! I am Amina, the virtual assistant for Visa Travel and Tours. How can I help you with your travel planning today?",
    chat_placeholder: "Ask about baggage limits, visas, office hours...",
    chat_send: "Send",
    chat_escalated_title: "Inquiry Transferred to Agent",
    chat_escalated_desc: "Your request requires consultant attention. An inquiry file has been generated.",
    chat_wa_continue: "Continue on WhatsApp",
    chat_email_leave: "Leave email address",
    chat_wa_modal_title: "WhatsApp Demo Mode",
    chat_wa_modal_body: "In the live system, this button opens WhatsApp directly to your designated agent, pre-filling it with the full conversation summary and reference number. No phone number is linked in this concept demo.",
    chat_wa_modal_message_label: "Message that would be sent to the agent:",
    chat_wa_modal_close: "Close Preview",
    chat_email_placeholder: "Enter email address to link to inquiry",
    chat_email_submit: "Link Email",
    chat_email_success: "Thank you! Your email has been linked to this reference number."
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    // Load persisted locale from localStorage
    const saved = localStorage.getItem("vtt_locale") as Locale;
    if (saved === "fr" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("vtt_locale", newLocale);
  };

  const t = (key: string, variables?: Record<string, string | number>): string => {
    let text = translations[locale][key] || translations["fr"][key] || key;
    
    if (variables) {
      Object.entries(variables).forEach(([vKey, vVal]) => {
        text = text.replace(new RegExp(`{${vKey}}`, "g"), String(vVal));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
