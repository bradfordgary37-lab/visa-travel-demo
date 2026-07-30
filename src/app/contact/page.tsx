"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useDemoClock } from "@/context/DemoClockContext";
import { supabase } from "@/lib/supabase";
import { Mail, CheckCircle2, ChevronRight, AlertCircle, Phone, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const { t, locale } = useLanguage();
  const { getSimulatedTime } = useDemoClock();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("ticketing");
  const [route, setRoute] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [passengers, setPassengers] = useState(1);

  // Status states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successData, setSuccessData] = useState<{
    reference: string;
    afterHours: boolean;
  } | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t("form_error_required");
    if (!email.trim()) {
      newErrors.email = t("form_error_required");
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t("form_error_email");
    }
    if ((type === "ticketing" || type === "tour") && !route.trim()) {
      newErrors.route = t("form_error_required");
    }
    if (type !== "other" && !travelDate) {
      newErrors.travelDate = t("form_error_required");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const timeInfo = getSimulatedTime();
    const refNum = `VTT-${Math.floor(1000 + Math.random() * 9000)}`;
    const office = locale === "en" ? "kampala" : "bujumbura";

    const inquirySummary = `Demande de type ${type} pour ${route || "N/A"}. Passagers: ${passengers}. Date: ${travelDate || "N/A"}.`;

    try {
      const { error } = await supabase.from("inquiries").insert([
        {
          reference: refNum,
          created_at: timeInfo.timestamp,
          locale,
          channel: "form",
          name,
          email,
          phone: phone || null,
          inquiry_type: type,
          route_or_dest: route || null,
          travel_date: travelDate || null,
          passengers: type === "other" ? null : Number(passengers),
          summary: inquirySummary,
          status: "new",
          after_hours: timeInfo.isAfterHours,
          escalated: false,
          assigned_office: office
        }
      ]);

      if (error) throw error;

      setSuccessData({
        reference: refNum,
        afterHours: timeInfo.isAfterHours
      });
    } catch (err: any) {
      console.error("Failed to submit inquiry:", err.message);
      setErrors({ form: "Database write failed. Check your network or schema policies." });
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
        {/* Success Card */}
        <div className="bg-white border border-slate-100 p-8 rounded-lg shadow-md text-center space-y-6">
          <div className="bg-emerald-50 p-4 rounded-full inline-block">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          
          <h2 className="font-serif text-2xl font-bold text-slate-900">
            {t("confirmation_title")}
          </h2>
          
          <div className="bg-slate-50 border border-slate-100 py-3 px-6 rounded inline-block font-mono">
            <span className="text-xs text-slate-500 block uppercase tracking-wider mb-1">
              {t("confirmation_ref")}
            </span>
            <span className="text-xl font-bold text-amber-700">{successData.reference}</span>
          </div>

          <p className="text-slate-600 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            {t("confirmation_body")}
          </p>

          <div className="pt-4">
            <button
              onClick={() => {
                setSuccessData(null);
                setName("");
                setEmail("");
                setPhone("");
                setRoute("");
                setTravelDate("");
                setPassengers(1);
              }}
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-mono font-bold"
            >
              <ArrowLeft className="h-4 w-4" />
              Soumettre une autre demande / Submit another inquiry
            </button>
          </div>
        </div>

        {/* Email Preview Section */}
        <div className="bg-slate-900 rounded-lg shadow-xl overflow-hidden border border-slate-800">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-850 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              {t("email_preview_title")}
            </span>
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
            </div>
          </div>
          
          <div className="p-6 text-xs md:text-sm font-sans space-y-4 text-slate-300">
            <div className="border-b border-slate-800 pb-3 space-y-1 font-mono text-[11px] text-slate-400">
              <div><span className="text-slate-600">De / From:</span> Visa Travel & Tours &lt;burundi@visatravelandtours.com&gt;</div>
              <div><span className="text-slate-600">À / To:</span> {name} &lt;{email}&gt;</div>
              <div><span className="text-slate-600">Objet / Subject:</span> {t("email_preview_subject")} #{successData.reference}</div>
            </div>

            <div className="space-y-4 pt-2">
              <p>{t("email_preview_salutation")} {name},</p>
              
              <p>{t("email_preview_text")}</p>

              {/* Dynamic SLA banner based on simulated time */}
              {successData.afterHours ? (
                <div className="bg-rose-950/40 border border-rose-900/50 p-4 rounded text-xs text-rose-300 font-mono leading-relaxed">
                  {t("email_preview_sla_after_hours")}
                </div>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-900/50 p-4 rounded text-xs text-emerald-300 font-mono leading-relaxed">
                  {t("email_preview_sla")}
                </div>
              )}

              <p className="border-t border-slate-850 pt-4 text-xs text-slate-500 font-mono">
                Visa Travel and Tours SPRL<br />
                Bd du Japon N° 42, Bujumbura, Burundi<br />
                IATA Accredited Agency
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex-grow">
      <div className="max-w-2xl mb-10 space-y-4">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-900 leading-tight">
          {t("contact_title")}
        </h1>
        <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
          {t("contact_subtitle")}
        </p>
      </div>

      {errors.form && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm p-4 rounded-md mb-6 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-6 md:p-8 rounded-lg shadow-sm space-y-6">
        
        {/* Row 1: Name & Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {t("form_name")} <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3.5 py-2 border rounded-md text-sm focus:ring-1 focus:ring-amber-500 outline-none ${
                errors.name ? "border-red-400 bg-red-50/10" : "border-slate-300"
              }`}
            />
            {errors.name && <p className="text-red-500 text-[10px] font-mono">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {t("form_email")} <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3.5 py-2 border rounded-md text-sm focus:ring-1 focus:ring-amber-500 outline-none ${
                errors.email ? "border-red-400 bg-red-50/10" : "border-slate-300"
              }`}
            />
            {errors.email && <p className="text-red-500 text-[10px] font-mono">{errors.email}</p>}
          </div>
        </div>

        {/* Row 2: Phone & Service Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {t("form_phone")}
            </label>
            <input
              id="phone"
              type="text"
              placeholder="+257 ...."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {t("form_type")} <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500 outline-none bg-white"
            >
              <option value="ticketing">{t("form_type_ticketing")}</option>
              <option value="tour">{t("form_type_tour")}</option>
              <option value="hotel">{t("form_type_hotel")}</option>
              <option value="visa_docs">{t("form_type_visa")}</option>
              <option value="other">{t("form_type_other")}</option>
            </select>
          </div>
        </div>

        {/* Conditional Rows: Route, Travel Date, Passengers */}
        {type !== "other" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            
            {(type === "ticketing" || type === "tour") && (
              <div className="space-y-2 md:col-span-1">
                <label htmlFor="route" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t("form_route")} <span className="text-red-500">*</span>
                </label>
                <input
                  id="route"
                  type="text"
                  placeholder="e.g. Kigali, Brussels"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className={`w-full px-3.5 py-2 border rounded-md text-sm focus:ring-1 focus:ring-amber-500 outline-none ${
                    errors.route ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {errors.route && <p className="text-red-500 text-[10px] font-mono">{errors.route}</p>}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="date" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t("form_date")} <span className="text-red-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className={`w-full px-3.5 py-2 border rounded-md text-sm focus:ring-1 focus:ring-amber-500 outline-none ${
                  errors.travelDate ? "border-red-400" : "border-slate-300"
                }`}
              />
              {errors.travelDate && <p className="text-red-500 text-[10px] font-mono">{errors.travelDate}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="passengers" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t("form_passengers")} <span className="text-red-500">*</span>
              </label>
              <input
                id="passengers"
                type="number"
                min={1}
                max={20}
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>

          </div>
        )}

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold text-sm py-3 rounded-md transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <span>{loading ? t("form_submitting") : t("form_submit")}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
