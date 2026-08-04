"use client";

import { Building2 } from "lucide-react";
import { useSchoolInfo, useLocale } from "../SchoolContext";
import { translate } from "../i18n";

export function SchoolBadge({
  variant = "light",
  compact = false,
}: {
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  const school = useSchoolInfo();
  const { locale } = useLocale();
  if (!school) return null;

  const isDark = variant === "dark";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      } ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}
    >
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ${
          compact ? "h-7 w-7" : "h-8 w-8"
        }`}
      >
        {school.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
        ) : (
          <Building2 className={`h-3.5 w-3.5 ${isDark ? "text-slate-300" : "text-slate-400"}`} />
        )}
      </div>
      <div className="min-w-0 leading-tight">
        <div
          className={`truncate font-semibold ${compact ? "text-[13px]" : "text-sm"} ${
            isDark ? "text-white" : "text-[#0B1D4D]"
          }`}
        >
          {school.name}
        </div>
        <div className={`${compact ? "text-[9px]" : "text-[11px]"} ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {translate(locale, "sidebar.centroAsignado")}
        </div>
      </div>
    </div>
  );
}
