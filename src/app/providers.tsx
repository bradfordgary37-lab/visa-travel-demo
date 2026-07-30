"use client";

import React from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import { DemoClockProvider } from "@/context/DemoClockContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DemoClockProvider>
        {children}
      </DemoClockProvider>
    </LanguageProvider>
  );
}
