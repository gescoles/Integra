"use client";

import Link from "next/link";
import { translate } from "../i18n";
import { useLocale } from "../SchoolContext";

export function VistaAlumnosTabs({ vistaCentro }: { vistaCentro: boolean }) {
  const { locale } = useLocale();
  return (
    <div className="mb-5 inline-flex gap-1 rounded-lg bg-slate-100 p-1">
      <Link
        href="/dashboard/mis-alumnos"
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          !vistaCentro ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        {translate(locale, "misAlumnos.tabMisAlumnos")}
      </Link>
      <Link
        href="/dashboard/mis-alumnos?vista=centro"
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          vistaCentro ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        {translate(locale, "misAlumnos.tabAlumnosCentro")}
      </Link>
    </div>
  );
}
