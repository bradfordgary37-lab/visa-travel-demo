"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";

export default function DemoBanner() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  // Bring banner back when changing pages to satisfy "dismissible-but-returning" behavior
  useEffect(() => {
    setIsVisible(true);
  }, [pathname]);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-600 text-white text-xs md:text-sm font-mono flex items-center justify-between px-4 py-2 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-100 animate-pulse" />
        <span>{t("demo_banner")}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard" 
          className="bg-white text-amber-800 hover:bg-amber-50 px-2.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all"
        >
          {t("view_dashboard")}
          <ArrowRight className="h-3 w-3" />
        </Link>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-amber-200 hover:text-white font-bold px-1"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    </div>
  );
}
