"use client";

import { useState } from "react";
import { Megaphone, Calendar, AlertTriangle, MessagesSquare } from "lucide-react";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

const CATEGORIA_CONFIG: Record<string, { label: string; color: string; icon: typeof Megaphone }> = {
  GENERAL: { label: "General", color: "bg-blue-50 text-[#2F6FED]", icon: Megaphone },
  ACADEMICO: { label: "Académico", color: "bg-emerald-50 text-emerald-600", icon: Calendar },
  CONVIVENCIA: { label: "Convivencia", color: "bg-amber-50 text-amber-600", icon: AlertTriangle },
};

type Aviso = {
  id: string;
  titulo: string;
  cuerpo: string;
  categoria: string;
  createdAt: string;
  schoolName: string;
};

export function ComunidadPanel({ avisos }: { avisos: Aviso[] }) {
  const { locale } = useLocale();
  const [tab, setTab] = useState<"foro" | "noticias">("noticias");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-[#0B1D4D]">{translate(locale, "comunidad.titulo")}</h3>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setTab("foro")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                tab === "foro" ? "bg-white text-[#2F6FED] shadow-sm" : "text-slate-500"
              }`}
            >
              {translate(locale, "comunidad.foro")}
            </button>
            <button
              onClick={() => setTab("noticias")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                tab === "noticias" ? "bg-white text-[#2F6FED] shadow-sm" : "text-slate-500"
              }`}
            >
              {translate(locale, "comunidad.noticias")}
            </button>
          </div>
        </div>
      </div>

      {tab === "foro" ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <MessagesSquare className="h-6 w-6 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">{translate(locale, "comunidad.foroProximamente")}</p>
          <p className="max-w-[240px] text-xs text-slate-400">{translate(locale, "comunidad.foroDescripcion")}</p>
        </div>
      ) : avisos.length === 0 ? (
        <p className="text-sm text-slate-400">{translate(locale, "comunidad.sinNoticias")}</p>
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => {
            const config = CATEGORIA_CONFIG[a.categoria] ?? CATEGORIA_CONFIG.GENERAL;
            return (
              <div key={a.id} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
                  {a.schoolName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-600">{a.schoolName}</span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.color}`}
                    >
                      <config.icon className="h-2.5 w-2.5" />
                      {config.label}
                    </span>
                  </div>
                  <h4 className="mt-1 truncate text-sm font-semibold text-slate-700">{a.titulo}</h4>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.cuerpo}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
