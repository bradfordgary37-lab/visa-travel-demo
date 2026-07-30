"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { ShieldCheck, MapPin, Phone, Mail, Award } from "lucide-react";

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-slate-900 pb-8">
          
          {/* Brand Info */}
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-100 mb-3">
              Visa Travel & Tours SPRL
            </h3>
            <p className="text-sm leading-relaxed mb-4 text-slate-400">
              {t("footer_tagline")}
            </p>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-xs text-amber-500 font-semibold font-mono">
                <Award className="h-4 w-4" />
                {t("footer_iata")}
              </span>
              <span className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <ShieldCheck className="h-4 w-4 text-slate-600" />
                {t("footer_systems")}
              </span>
            </div>
          </div>

          {/* Bujumbura Head Office */}
          <div>
            <h4 className="font-serif text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-amber-600" />
              {t("footer_bujumbura")}
            </h4>
            <ul className="text-xs space-y-2 font-mono">
              <li className="flex gap-2">
                <span className="text-slate-600">Addr:</span>
                <span>Bd du Japon N° 42, Bujumbura Mairie, Burundi</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-slate-600" />
                <span>+257 22219656</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-slate-600" />
                <span>burundi@visatravelandtours.com</span>
              </li>
            </ul>
          </div>

          {/* Kampala Office */}
          <div>
            <h4 className="font-serif text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-amber-600" />
              {t("footer_kampala")}
            </h4>
            <ul className="text-xs space-y-2 font-mono">
              <li className="flex gap-2">
                <span className="text-slate-600">Addr:</span>
                <span>Raja Chambers, Plot 3A, Parliament Avenue, 1st Floor, Office 29 & 31, Kampala</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-slate-600" />
                <span>+256 731 419 028</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-slate-600" />
                <span>uganda@visatravelandtours.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Association & Copyright Credits */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-600 border-t border-slate-900 pt-4">
          <div className="flex items-center gap-2">
            <span>{t("footer_association")}</span>
          </div>
          <div className="text-center md:text-right space-y-1">
            <p>© {currentYear} Visa Travel and Tours SPRL. {t("footer_rights")}</p>
            <p className="text-amber-600 font-semibold">{t("footer_created_by")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
