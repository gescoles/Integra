"use client";

import Link from "next/link";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

export function DisciplinaTabs({ vista }: { vista: "incidencias" | "expedientes" | "expulsiones" }) {
  const { locale } = useLocale();

  return (
    <div className="mb-5 inline-flex gap-1 rounded-lg bg-slate-100 p-1">
      <Link
        href="/dashboard/expedientes"
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          vista === "incidencias" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        {translate(locale, "disciplina.tabIncidencias")}
      </Link>
      <Link
        href="/dashboard/expedientes?vista=expedientes"
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          vista === "expedientes" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        {translate(locale, "disciplina.tabExpedientes")}
      </Link>
      <Link
        href="/dashboard/expedientes?vista=expulsiones"
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          vista === "expulsiones" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        {translate(locale, "disciplina.tabExpulsiones")}
      </Link>
    </div>
  );
}
