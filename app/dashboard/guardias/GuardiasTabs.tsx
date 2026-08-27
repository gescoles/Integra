"use client";

import Link from "next/link";

export function GuardiasTabs({ activo }: { activo: "guardias" | "absentismo" }) {
  return (
    <div className="mb-5 inline-flex gap-1 rounded-lg bg-slate-100 p-1">
      <Link
        href="/dashboard/guardias"
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          activo === "guardias" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        Guardias
      </Link>
      <Link
        href="/dashboard/guardias/absentismo"
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          activo === "absentismo" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
        }`}
      >
        Absentismo
      </Link>
    </div>
  );
}
