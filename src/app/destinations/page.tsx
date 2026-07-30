"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Plane, Compass, ArrowRight, ShieldCheck } from "lucide-react";

export default function DestinationsPage() {
  const { t } = useLanguage();

  const connections = [
    {
      city: "Nairobi, Kenya (NBO)",
      tag: "Business & Hub Hub",
      desc: t("dest_nairobi_desc"),
      duration: "1h 35m",
      airline: "Kenya Airways / Uganda Airlines",
      luggage: "2 pieces (23kg each)",
      price: "$480 USD (~1,390,000 BIF)"
    },
    {
      city: "Kigali, Rwanda (KGL)",
      tag: "Regional Connection",
      desc: t("dest_kigali_desc"),
      duration: "0h 40m",
      airline: "RwandAir",
      luggage: "1 piece (23kg)",
      price: "$280 USD (~812,000 BIF)"
    },
    {
      city: "Entebbe, Uganda (EBB)",
      tag: "Institutional Route",
      desc: t("dest_entebbe_desc"),
      duration: "1h 10m",
      airline: "Uganda Airlines",
      luggage: "2 pieces (23kg each)",
      price: "$350 USD (~1,015,000 BIF)"
    },
    {
      city: "Brussels, Belgium (BRU)",
      tag: "Long-haul European",
      desc: t("dest_brussels_desc"),
      duration: "8h 15m",
      airline: "Brussels Airlines",
      luggage: "2 pieces (23kg each)",
      price: "$1,200 USD (~3,480,000 BIF)"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
      
      {/* Header */}
      <div className="max-w-3xl mb-16 space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
          {t("dest_title")}
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
          {t("dest_subtitle")}
        </p>
      </div>

      {/* Destinations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {connections.map((conn, index) => (
          <div 
            key={index} 
            className="bg-white border border-slate-105 p-6 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {conn.tag}
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Plane className="h-3 w-3" />
                  {conn.duration}
                </span>
              </div>

              <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                BJM <ArrowRight className="h-4 w-4 text-slate-400" /> {conn.city}
              </h2>

              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                {conn.desc}
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono py-2 text-slate-500 border-t border-slate-50 border-b">
                <div>
                  <span className="text-[10px] block text-slate-400 uppercase">Airlines:</span>
                  <span className="font-bold text-slate-700">{conn.airline}</span>
                </div>
                <div>
                  <span className="text-[10px] block text-slate-400 uppercase">Luggage Allowance:</span>
                  <span className="font-bold text-slate-700">{conn.luggage}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-100">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Indicative fare:</span>
              <span className="text-xs md:text-sm font-mono font-bold text-slate-900">{conn.price}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
