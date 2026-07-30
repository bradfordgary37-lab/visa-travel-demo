"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Ticket, Compass, Hotel, Landmark, CheckCircle2 } from "lucide-react";

export default function ServicesPage() {
  const { t } = useLanguage();

  const services = [
    {
      icon: <Ticket className="h-8 w-8 text-amber-600" />,
      title: t("service_ticketing_title"),
      desc: t("service_ticketing_desc"),
      price: "$150 USD (~435,000 BIF) indicative booking fee & ticketing base",
      details: [
        "Instant ticketing for regional connections (BJM-NBO, BJM-KGL, BJM-EBB)",
        "Global ticket routing through Amadeus and Galileo networks",
        "Flexible booking management, ticket swaps, and cancellation handling",
        "Corporate discount profiles for frequent travelers and organizations"
      ]
    },
    {
      icon: <Compass className="h-8 w-8 text-amber-600" />,
      title: t("service_tours_title"),
      desc: t("service_tours_desc"),
      price: "$380 USD (~1,100,000 BIF) starting tour package price",
      details: [
        "Regional East Africa safaris, national park tours, and lake getaways",
        "Custom travel packages tailored to institutional delegation trips",
        "Local ground transfers and professional English/French speaking guides",
        "Complete group itineraries including ticketing, transport, and lodging"
      ]
    },
    {
      icon: <Hotel className="h-8 w-8 text-amber-600" />,
      title: t("service_hotels_title"),
      desc: t("service_hotels_desc"),
      price: "$85 USD (~245,000 BIF) average hotel room rate per night",
      details: [
        "Negotiated rates with major corporate hotel chains in East Africa",
        "Direct bookings in Bujumbura, Kigali, Nairobi, Kampala, and Entebbe",
        "Flexible check-in / check-out conditions for corporate partnerships",
        "Verified security compliance reviews for international staff lodgings"
      ]
    },
    {
      icon: <Landmark className="h-8 w-8 text-amber-600" />,
      title: t("service_guidance_title"),
      desc: t("service_guidance_desc"),
      price: "Included in air ticketing package or $45 USD (~130,000 BIF) standalone",
      details: [
        "Baggage allowance check across multiple airlines and ticketing layers",
        "Travel visa requirement checks for Burundian and foreign passports",
        "Vetting and authentication of necessary vaccination certificates",
        "Documentation checklist guidance for regional and European routes"
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
      
      {/* Header section */}
      <div className="max-w-3xl mb-16 space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
          {t("services_title")}
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
          {t("services_subtitle")}
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {services.map((service, index) => (
          <div 
            key={index}
            className="bg-white border border-slate-100 p-8 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-amber-50 p-3 rounded-md shrink-0">
                  {service.icon}
                </div>
                <h2 className="font-serif text-lg font-bold text-slate-900">
                  {service.title}
                </h2>
              </div>
              
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                {service.desc}
              </p>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded font-mono text-[10px] md:text-xs">
                <span className="font-bold text-amber-700">{t("service_indicative_price")} </span>
                <span className="text-slate-700 font-semibold">{service.price}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                {service.details.map((detail, dIdx) => (
                  <li key={dIdx} className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
