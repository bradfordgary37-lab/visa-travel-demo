"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Award, ShieldAlert, Clock, Building, Mail, Phone, Users } from "lucide-react";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow space-y-16">
      
      {/* Header */}
      <div className="max-w-3xl space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
          {t("about_title")}
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
          {t("about_subtitle")}
        </p>
      </div>

      {/* Grid: Story & Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Story */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="font-serif text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            {t("about_history_title")}
          </h2>
          <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
            {t("about_history_desc")}
          </p>
          <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
            Notre philosophie repose sur une prise en charge complète du voyageur : de la conformité des documents de transport aux accords tarifaires avec les compagnies aériennes partenaires. Nous simplifions les liaisons complexes pour que nos clients se concentrent exclusivement sur leurs objectifs.
          </p>
        </div>

        {/* Credentials */}
        <div className="lg:col-span-5 bg-white border border-slate-100 p-6 rounded-lg shadow-sm space-y-6">
          <h2 className="font-serif text-base font-bold text-slate-950 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            Accréditations Officielles
          </h2>

          <div className="space-y-4 text-xs font-mono text-slate-600">
            <div className="flex gap-3 items-start bg-slate-50 p-3 rounded">
              <span className="bg-amber-600 text-white p-1 rounded text-[10px] font-bold tracking-wide uppercase shrink-0">IATA</span>
              <div>
                <span className="font-bold text-slate-900 block">IATA Accredited Agency</span>
                <span>Enregistrée sous licence d'agrément officielle IATA de billetterie internationale.</span>
              </div>
            </div>

            <div className="flex gap-3 items-start bg-slate-50 p-3 rounded">
              <span className="bg-slate-700 text-white p-1 rounded text-[10px] font-bold tracking-wide uppercase shrink-0">ABAV</span>
              <div>
                <span className="font-bold text-slate-900 block">Membre Association ABAV</span>
                <span>Membre de l'Association des Agents de Voyage du Burundi, respectant la charte qualité de la profession.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Office Locations & Hours */}
      <div className="border-t border-slate-200 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Office hours */}
          <div className="bg-slate-900 text-white p-6 rounded-lg shadow-md space-y-4">
            <h3 className="font-serif text-base font-bold text-slate-100 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              {t("about_office_hours")}
            </h3>
            <div className="text-xs space-y-3 font-mono text-slate-300">
              <div className="border-b border-slate-800 pb-2">
                <span className="block font-bold text-slate-100">{t("about_weekdays")}</span>
                <span className="text-[10px] text-slate-500">Heures de service standard des agents de guichet</span>
              </div>
              <div>
                <span className="block font-bold text-slate-100">{t("about_weekend")}</span>
                <span className="text-[10px] text-amber-500 font-semibold">Les urgences et captures de demandes restent assurées à 100% en continu par Amina.</span>
              </div>
            </div>
          </div>

          {/* Bujumbura branch */}
          <div className="bg-white border border-slate-100 p-6 rounded-lg shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="h-5 w-5 text-amber-600" />
              {t("footer_bujumbura")}
            </h3>
            <ul className="text-xs space-y-2.5 font-mono text-slate-600">
              <li>
                <span className="text-[10px] block text-slate-400">Siège Social Burundi :</span>
                <span className="font-bold">Bd du Japon N° 42, Bujumbura Mairie</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>+257 22219656</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>burundi@visatravelandtours.com</span>
              </li>
            </ul>
          </div>

          {/* Kampala branch */}
          <div className="bg-white border border-slate-100 p-6 rounded-lg shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="h-5 w-5 text-amber-600" />
              {t("footer_kampala")}
            </h3>
            <ul className="text-xs space-y-2.5 font-mono text-slate-600">
              <li>
                <span className="text-[10px] block text-slate-400">Bureaux Uganda :</span>
                <span className="font-bold">Raja Chambers, Plot 3A, Parliament Avenue, 1st Floor, Office 29 & 31</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>+256 731 419 028</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>uganda@visatravelandtours.com</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

    </div>
  );
}
