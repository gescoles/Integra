"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    // Evita mismatch de hidratación: no renderiza hora hasta estar en cliente
    return <div className="h-[52px] w-[190px]" />;
  }

  const dayName = now.toLocaleDateString("es-ES", { weekday: "long" });
  const dateStr = now.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
      <div className="flex flex-col items-end leading-none">
        <span className="text-[11px] font-medium capitalize text-slate-400">
          {dayName}, {dateStr}
        </span>
        <span className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0B1D4D]">
          {timeStr}
        </span>
      </div>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
    </div>
  );
}

export function DashboardHeader({
  title,
  subtitle,
  notificationCount = 0,
}: {
  title: string;
  subtitle: string;
  userName?: string;
  role?: string;
  notificationCount?: number;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D4D]">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <NotificationBell />

        <LiveClock />
      </div>
    </div>
  );
}
