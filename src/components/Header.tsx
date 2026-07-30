"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage, Locale } from "@/context/LanguageContext";
import { Menu, X, PlaneTakeoff, Globe2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { locale, setLocale, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleLanguage = () => {
    setLocale(locale === "fr" ? "en" : "fr");
  };

  const navLinks = [
    { href: "/", label: t("nav_home") },
    { href: "/services", label: t("nav_services") },
    { href: "/destinations", label: t("nav_destinations") },
    { href: "/contact", label: t("nav_contact") },
    { href: "/about", label: t("nav_about") }
  ];

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-9 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand Area */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-amber-600 p-2 rounded shadow-inner group-hover:bg-amber-500 transition-colors">
              <PlaneTakeoff className="h-5 w-5 text-white" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-slate-100">
              Visa Travel & Tours
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-wide transition-all ${
                  isActive(link.href)
                    ? "text-amber-500 border-b-2 border-amber-500 pb-1"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Lang Switcher & Mobile Menu Trigger */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 rounded-md bg-slate-850 hover:bg-slate-800 text-xs font-mono tracking-wider transition-colors text-amber-500 font-bold"
              aria-label="Switch Language"
            >
              <Globe2 className="h-3.5 w-3.5" />
              <span>{locale === "fr" ? "FR | EN" : "EN | FR"}</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive(link.href)
                  ? "bg-slate-800 text-amber-500"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
