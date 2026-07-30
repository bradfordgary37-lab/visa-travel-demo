"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { Ticket, Palmtree, Hotel, FileText, Send, Moon, Sun, Clock } from "lucide-react";

interface InquiryRow {
  id: string;
  reference: string;
  created_at: string;
  name: string;
  inquiry_type: string;
  route_or_dest: string;
  status: string;
  after_hours: boolean;
  assigned_office: string;
}

export default function LiveTimeline() {
  const { locale, t } = useLanguage();
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLatestInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from("inquiries")
        .select("id, reference, created_at, name, inquiry_type, route_or_dest, status, after_hours, assigned_office")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setInquiries(data as InquiryRow[]);
      }
    } catch (err) {
      console.error("Error fetching live timeline inquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestInquiries();

    // Set up polling interval to make it feel "live" without heavy WebSocket socket connections
    const interval = setInterval(fetchLatestInquiries, 6000);

    return () => clearInterval(interval);
  }, []);

  const getInquiryIcon = (type: string) => {
    switch (type) {
      case "ticketing":
        return <Ticket className="h-4 w-4 text-amber-500" />;
      case "tour":
        return <Palmtree className="h-4 w-4 text-emerald-500" />;
      case "hotel":
        return <Hotel className="h-4 w-4 text-sky-500" />;
      default:
        return <FileText className="h-4 w-4 text-purple-500" />;
    }
  };

  const maskName = (fullName: string) => {
    const parts = fullName.split(" ");
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return fullName;
  };

  const formatBujumburaTime = (isoString: string) => {
    const date = new Date(isoString);
    // Convert to UTC+2 (Burundi Time)
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Bujumbura",
      hour12: false
    };
    return date.toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", options);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-lg shadow-xl p-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-2">
        <div>
          <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
            {t("timeline_title")}
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">{t("timeline_subtitle")}</p>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-md text-[10px] uppercase font-mono tracking-wider text-amber-500 flex items-center gap-1.5 self-start">
          <Clock className="h-3.5 w-3.5" />
          <span>Real-time DB Sync</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 py-8 text-center text-slate-500 text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600 mx-auto mb-2"></div>
          Syncing records...
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-8 text-slate-600 text-xs">
          No inquiries found. Submit one on the contact page to see it here live!
        </div>
      ) : (
        <div className="relative border-l border-slate-800 pl-4 space-y-6 ml-2 py-2">
          {inquiries.map((inq) => (
            <div key={inq.id} className="relative group">
              {/* Timeline dot */}
              <div className="absolute -left-[25px] top-1 bg-slate-950 border border-slate-800 rounded-full p-1 group-hover:border-amber-500 transition-colors">
                {getInquiryIcon(inq.inquiry_type)}
              </div>

              {/* Card Container */}
              <div className="bg-slate-950/40 hover:bg-slate-950/80 border border-slate-900 hover:border-slate-800 rounded-md p-4 transition-all">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-500">
                      {inq.reference}
                    </span>
                    <span className="text-slate-300 text-xs font-semibold">
                      {maskName(inq.name)}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[10px] font-mono font-bold">
                    {formatBujumburaTime(inq.created_at)} CAT
                  </span>
                </div>

                <div className="text-slate-400 text-xs mb-3 flex items-center justify-between gap-4">
                  <span>
                    {inq.inquiry_type === "ticketing" && `${t("form_type_ticketing")} ➔ ${inq.route_or_dest}`}
                    {inq.inquiry_type === "tour" && `${t("form_type_tour")} ➔ ${inq.route_or_dest}`}
                    {inq.inquiry_type === "hotel" && `${t("form_type_hotel")}`}
                    {inq.inquiry_type === "visa_docs" && `${t("form_type_visa")}`}
                    {inq.inquiry_type === "other" && `${t("form_type_other")}`}
                  </span>
                  
                  {/* Office badge */}
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {inq.assigned_office}
                  </span>
                </div>

                {/* Automation Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/50 pt-2 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Send className="h-3 w-3" />
                    {t("timeline_status_ack")}
                  </span>
                  
                  {inq.after_hours && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/30 border border-rose-900/50 text-rose-400 font-bold">
                      <Moon className="h-3 w-3 text-rose-500" />
                      {t("timeline_after_hours")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
