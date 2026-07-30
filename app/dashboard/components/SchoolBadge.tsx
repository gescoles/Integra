"use client";

import { Building2 } from "lucide-react";
import { useSchoolInfo } from "../SchoolContext";

export function SchoolBadge({ variant = "light" }: { variant?: "light" | "dark" }) {
  const school = useSchoolInfo();
  if (!school) return null;

  const isDark = variant === "dark";

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
        isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {school.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
        ) : (
          <Building2 className={`h-4 w-4 ${isDark ? "text-slate-300" : "text-slate-400"}`} />
        )}
      </div>
      <div className="min-w-0 leading-tight">
        <div className={`truncate text-sm font-semibold ${isDark ? "text-white" : "text-[#0B1D4D]"}`}>
          {school.name}
        </div>
        <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Centro asignado
        </div>
      </div>
    </div>
  );
}
