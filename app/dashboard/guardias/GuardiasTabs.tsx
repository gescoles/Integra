"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { key: "pedir", label: "Pedir Guardia" },
  { key: "solicitudes", label: "Solicitudes de ausencias" },
  { key: "planificacion", label: "Planificación de Guardias" },
] as const;

export function GuardiasTabs({ schoolId }: { schoolId?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enAbsentismo = pathname.includes("/absentismo");
  const vista = enAbsentismo ? null : (searchParams.get("vista") ?? "solicitudes");
  const schoolQuery = schoolId ? `&school=${schoolId}` : "";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-slate-200">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/dashboard/guardias?vista=${t.key}${schoolQuery}`}
          className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            vista === t.key ? "border-[#FD5249] text-[#FD5249]" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.label}
        </Link>
      ))}
      <Link
        href={`/dashboard/guardias/absentismo${schoolId ? `?school=${schoolId}` : ""}`}
        className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
          enAbsentismo ? "border-[#FD5249] text-[#FD5249]" : "border-transparent text-slate-500 hover:text-slate-700"
        }`}
      >
        Absentismo
      </Link>
    </div>
  );
}
