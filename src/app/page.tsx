"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import LiveTimeline from "@/components/LiveTimeline";
import { Award, Compass, Ticket, CalendarRange, Map, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const { t } = useLanguage();

  const coreServicesList = [
    {
      icon: <Ticket className="h-6 w-6 text-amber-500" />,
      title: t("service_ticketing_title"),
      desc: t("service_ticketing_desc")
    },
    {
      icon: <Compass className="h-6 w-6 text-amber-500" />,
      title: t("service_tours_title"),
      desc: t("service_tours_desc")
    },
    {
      icon: <CalendarRange className="h-6 w-6 text-amber-500" />,
      title: t("service_guidance_title"),
      desc: t("service_guidance_desc")
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow flex flex-col justify-center">
      
      {/* Hero & Timeline Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
        
        {/* Left: Branding & Core Callout */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/10 border border-slate-900/5 text-slate-800 text-xs font-semibold uppercase tracking-wider font-mono">
            <Award className="h-4 w-4 text-amber-600" />
            Burundi · IATA Accredited
          </div>
          
          <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            {t("hero_title")}
          </h1>
          
          <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl">
            {t("hero_subtitle")}
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/contact"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-md shadow-md hover:shadow-lg transition-all"
            >
              {t("cta_inquiry")}
            </Link>
            <Link
              href="/services"
              className="border border-slate-350 hover:bg-slate-100 text-slate-800 font-semibold text-sm px-6 py-3 rounded-md transition-all"
            >
              {t("cta_services")}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
              <span>Membre de l'ABAV (Burundi)</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
              <span>Amadeus & Galileo Connected</span>
            </div>
          </div>
        </div>

        {/* Right: Signature Live Timeline */}
        <div className="lg:col-span-5 w-full lg:sticky lg:top-32">
          <LiveTimeline />
        </div>

      </div>

      {/* Services Breakdown Row */}
      <div className="border-t border-slate-200 pt-16 mb-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">
            {t("services_title")}
          </h2>
          <p className="text-slate-600 text-xs md:text-sm mt-2">
            {t("services_subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {coreServicesList.map((service, index) => (
            <div 
              key={index}
              className="bg-white border border-slate-100 p-6 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-slate-200 flex flex-col h-full"
            >
              <div className="mb-4 bg-amber-50 p-2.5 rounded-md inline-block w-fit">
                {service.icon}
              </div>
              <h3 className="font-serif text-base font-bold text-slate-900 mb-2">
                {service.title}
              </h3>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed flex-grow">
                {service.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
