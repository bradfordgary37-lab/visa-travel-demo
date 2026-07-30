"use client";

import React from "react";
import { useDemoClock } from "@/context/DemoClockContext";
import { Clock, Sun, Moon } from "lucide-react";

export default function DemoClockControl() {
  const { mode, setMode, getSimulatedTime } = useDemoClock();
  const timeInfo = getSimulatedTime();

  return (
    <div className="fixed bottom-6 left-6 z-40 bg-slate-900 border border-slate-800 text-white rounded-lg shadow-xl p-4 max-w-xs font-sans">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
          Demo Time Control
        </span>
      </div>

      <p className="text-slate-400 text-xs mb-3 leading-relaxed">
        Simulate office hours to test instant after-hours receipt and priority ticketing routing:
      </p>

      <div className="flex bg-slate-950 p-1 rounded-md border border-slate-900 gap-1 mb-2">
        <button
          onClick={() => setMode("regular")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-all ${
            mode === "regular"
              ? "bg-amber-600 text-white shadow"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
          <span>Open</span>
        </button>
        <button
          onClick={() => setMode("after_hours")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-all ${
            mode === "after_hours"
              ? "bg-rose-700 text-white shadow"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          <span>After-Hours</span>
        </button>
      </div>

      <div className="text-center bg-slate-950/50 py-1 px-2 rounded border border-slate-900/50">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
          Simulated CAT Time:
        </div>
        <div className="text-xs font-mono font-bold text-amber-500">
          {timeInfo.day} · {timeInfo.time}
        </div>
      </div>
    </div>
  );
}
