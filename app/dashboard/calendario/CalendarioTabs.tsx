"use client";

import Link from "next/link";

export function CalendarioTabs({
  tab,
  schoolId,
}: {
  tab: "escolar" | "semana";
  schoolId?: string;
}) {
  function hrefDe(destino: "escolar" | "semana") {
    const params = new URLSearchParams();
    if (schoolId) params.set("school", schoolId);
    params.set("tab", destino);
    return `/dashboard/calendario?${params.toString()}`;
  }

  return (
    <div className="mb-5 inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      <Link
        href={hrefDe("escolar")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          tab === "escolar" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        Calendario Escolar
      </Link>
      <Link
        href={hrefDe("semana")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          tab === "semana" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        Mi semana
      </Link>
    </div>
  );
}
