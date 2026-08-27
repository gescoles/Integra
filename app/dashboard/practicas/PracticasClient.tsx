"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, FileText, FileSpreadsheet } from "lucide-react";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";
import { CargarCatalogoModulosButton } from "./CargarCatalogoModulosButton";

type Row = {
  id: string;
  alumnoNombre: string;
  alumnoCurso: string;
  alumnoAvatarUrl: string | null;
  promocion: string;
  cicloFormativo: string | null;
  tutorImesNombre: string | null;
  numConvenios: number;
  estadoConvenioActivo: string | null;
};

type ProfesorOption = { id: string; name: string };

export function PracticasClient({
  rows,
  profesores,
  showFilters = false,
  schoolId,
}: {
  rows: Row[];
  profesores: ProfesorOption[];
  showFilters?: boolean;
  schoolId?: string | null;
}) {
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [promocionFilter, setPromocionFilter] = useState("Todos");
  const [tutorFilter, setTutorFilter] = useState("Todos");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && !r.alumnoNombre.toLowerCase().includes(q) && !r.alumnoCurso.toLowerCase().includes(q)) return false;
      if (promocionFilter !== "Todos" && r.promocion !== promocionFilter) return false;
      if (tutorFilter !== "Todos" && r.tutorImesNombre !== profesores.find((p) => p.id === tutorFilter)?.name) return false;
      return true;
    });
  }, [rows, search, promocionFilter, tutorFilter, profesores]);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(locale, "practicas.buscarPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>

        <select
          value={promocionFilter}
          onChange={(e) => setPromocionFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
        >
          <option value="Todos">{translate(locale, "practicas.todasPromociones")}</option>
          <option value="PRIMERA">{translate(locale, "practicas.primeraPromocion")}</option>
          <option value="SEGUNDA">{translate(locale, "practicas.segundaPromocion")}</option>
        </select>

        {showFilters && (
          <select
            value={tutorFilter}
            onChange={(e) => setTutorFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
          >
            <option value="Todos">{translate(locale, "practicas.todosTutores")}</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          <CargarCatalogoModulosButton />
          {showFilters && schoolId && (
            <a
              href={`/api/practicas/export?school=${schoolId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <FileSpreadsheet className="h-4 w-4" /> {translate(locale, "practicas.descargarExcel")}
            </a>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          {rows.length === 0 ? translate(locale, "practicas.sinFichas") : translate(locale, "practicas.sinResultados")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-3 pr-4 font-medium">{translate(locale, "practicas.colAlumno")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "practicas.promocion")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "practicas.cicloFormativo")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "practicas.colTutorImes")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "practicas.colConvenios")}</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {r.alumnoAvatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.alumnoAvatarUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">{r.alumnoNombre}</div>
                        <div className="text-xs text-slate-400">{r.alumnoCurso}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.promocion === "PRIMERA" ? "bg-blue-50 text-[#FD5249]" : "bg-violet-50 text-violet-600"}`}>
                      {r.promocion === "PRIMERA" ? translate(locale, "practicas.primeraPromocion") : translate(locale, "practicas.segundaPromocion")}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{r.cicloFormativo ?? "—"}</td>
                  <td className="py-3 pr-4 text-slate-500">{r.tutorImesNombre ?? "—"}</td>
                  <td className="py-3 pr-4 text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      {r.numConvenios}
                      {r.estadoConvenioActivo && <span className="text-xs text-slate-400">· {r.estadoConvenioActivo}</span>}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/dashboard/practicas/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#FD5249] hover:underline"
                    >
                      {translate(locale, "practicas.verConvenios")} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-400">
        {translate(locale, "tutorias.mostrando")} {filtered.length} {translate(locale, "tutorias.de")} {rows.length}
      </div>
    </div>
  );
}
