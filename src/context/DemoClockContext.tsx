"use client";

import React, { createContext, useContext, useState } from "react";

export type ClockMode = "regular" | "after_hours";

interface DemoClockContextType {
  mode: ClockMode;
  setMode: (mode: ClockMode) => void;
  getSimulatedTime: () => {
    day: string;
    time: string;
    isAfterHours: boolean;
    timestamp: string;
  };
}

const DemoClockContext = createContext<DemoClockContextType | undefined>(undefined);

export function DemoClockProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ClockMode>("regular");

  const getSimulatedTime = () => {
    if (mode === "after_hours") {
      return {
        day: "Samedi / Saturday",
        time: "23:00 CAT",
        isAfterHours: true,
        // Saturday 23:00 CAT (UTC+2) -> 21:00 UTC
        timestamp: new Date(new Date().setDate(new Date().getDate() - (new Date().getDay() + 1) % 7)).toISOString().split("T")[0] + "T21:00:00.000Z"
      };
    } else {
      return {
        day: "Lundi / Monday",
        time: "10:00 CAT",
        isAfterHours: false,
        // Monday 10:00 CAT (UTC+2) -> 08:00 UTC
        timestamp: new Date(new Date().setDate(new Date().getDate() - (new Date().getDay() - 1) % 7)).toISOString().split("T")[0] + "T08:00:00.000Z"
      };
    }
  };

  return (
    <DemoClockContext.Provider value={{ mode, setMode, getSimulatedTime }}>
      {children}
    </DemoClockContext.Provider>
  );
}

export function useDemoClock() {
  const context = useContext(DemoClockContext);
  if (!context) {
    throw new Error("useDemoClock must be used within a DemoClockProvider");
  }
  return context;
}
