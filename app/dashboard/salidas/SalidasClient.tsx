"use client";

import { useMemo, useState } from "react";
import { Search, Trash2, FileSpreadsheet } from "lucide-react";
import { deleteSalida } from "./actions";
import { EditarSalidaModal } from "./EditarSalidaModal";
import { AnularSalidaButton } from "./AnularSalidaButton";
import { SALIDA_ESTADO_COLORS } from "../constants";
import { useLocale, useGuardadoTransition } from "../SchoolContext";
import { translate } from "../i18n";

type Row = {
  id: string;
  curso: string;
  tipo: string | null;
  actividad: string;
  fecha: string;
  horaSalida: string;
  horaVuelta: string | null;
  responsableId: string;
  responsableName: string;
  profesoresIds: string[];
  profesoresNombres: string[];
  numAlumnos: number;
  costo: number;
  moneda: string;
  observaciones: string | null;
  estado: string;
  creadoPorId: string;
  creadoPorNombre: string;
  departamentoId: string | null;
  departamentoNombre: string | null;
};

type ProfesorOption = { id: string; name: string };
type DepartamentoOption = { id: string; nombre: string };

const monedaSimbolo: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

export function SalidasClient({
  rows,
  profesores,
  departamentos = [],
  currentUserId,
  canManageAll = false,
  puedeAnular = false,
  showFilters = false,
  schoolId,
}: {
  rows: Row[];
  profesores: ProfesorOption[];
  departamentos?: DepartamentoOption[];
  currentUserId: string;
  canManageAll?: boolean;
  puedeAnular?: boolean;
  showFilters?: boolean;
  schoolId?: string;
}) {
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [responsableFilter, setResponsableFilter] = useState("Todos");
  const [cursoFilter, setCursoFilter] = useState("Todos");
  const [departamentoFilter, setDepartamentoFilter] = useState("Todos");
  const [fechaFilter, setFechaFilter] = useState("");
  const [isPending, startTransition] = useGuardadoTransition();
  const [error, setError] = useState<string | null>(null);

  const cursos = useMemo(() => Array.from(new Set(rows.map((r) => r.curso))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && !r.actividad.toLowerCase().includes(q) && !r.curso.toLowerCase().includes(q)) return false;
      if (responsableFilter !== "Todos" && r.responsableId !== responsableFilter) return false;
      if (cursoFilter !== "Todos" && r.curso !== cursoFilter) return false;
      if (departamentoFilter !== "Todos" && r.departamentoId !== departamentoFilter) return false;
      if (fechaFilter && r.fecha.slice(0, 10) !== fechaFilter) return false;
      return true;
    });
  }, [rows, search, responsableFilter, cursoFilter, departamentoFilter, fechaFilter]);

  function handleDelete(id: string, actividad: string) {
    if (!confirm(`¿Eliminar la salida "${actividad}"? No se puede deshacer.`)) return;
    startTransition(async () => {
      try {
        await deleteSalida(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(locale, "salidas.buscarPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>

        {showFilters && (
          <select
            value={responsableFilter}
            onChange={(e) => setResponsableFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
          >
            <option value="Todos">{translate(locale, "salidas.todosResponsables")}</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {showFilters && (
          <select
            value={cursoFilter}
            onChange={(e) => setCursoFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
          >
            <option value="Todos">{translate(locale, "material.todosCursos")}</option>
            {cursos.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {showFilters && departamentos.length > 0 && (
          <select
            value={departamentoFilter}
            onChange={(e) => setDepartamentoFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
          >
            <option value="Todos">Tots els departaments</option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        )}

        {showFilters && (
          <input
            type="date"
            value={fechaFilter}
            onChange={(e) => setFechaFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
          />
        )}

        {showFilters && schoolId && (
          <a
            href={`/api/salidas/export?school=${schoolId}${
              responsableFilter !== "Todos" ? `&profesor=${responsableFilter}` : ""
            }`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <FileSpreadsheet className="h-4 w-4" /> {translate(locale, "salidas.descargarExcel")}
          </a>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          {rows.length === 0 ? translate(locale, "salidas.sinSalidas") : translate(locale, "salidas.sinResultados")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-3 pr-4 font-medium">{translate(locale, "salidas.colActividad")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "salidas.colResponsable")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "tutorias.colFecha")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "salidas.colAlumnos")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "salidas.colCosto")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "guardias.colEstado")}</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const puedeEditarOBorrar = canManageAll || (r.creadoPorId === currentUserId && r.estado === "PENDIENTE");
                return (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-slate-700">{r.actividad}</div>
                      <div className="text-xs text-slate-400">
                        {r.curso}{r.tipo ? ` · ${r.tipo}` : ""}{r.departamentoNombre ? ` · ${r.departamentoNombre}` : ""}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      {r.responsableName}
                      {r.profesoresNombres.length > 0 && (
                        <div className="text-xs text-slate-400">+{r.profesoresNombres.length} {translate(locale, "salidas.acompanantes")}</div>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-slate-500">
                      {new Date(r.fecha).toLocaleDateString("es-ES")}
                      <div className="text-xs text-slate-400">
                        {r.horaSalida} – {r.horaVuelta}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{r.numAlumnos}</td>
                    <td className="py-4 pr-4 text-slate-600">
                      {r.costo.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {monedaSimbolo[r.moneda] ?? r.moneda}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${SALIDA_ESTADO_COLORS[r.estado]}`}>
                        {translate(locale, `status.${r.estado}` as never)}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-0.5">
                        {puedeAnular && r.estado === "APROBADA" && (
                          <AnularSalidaButton id={r.id} actividad={r.actividad} />
                        )}
                        {puedeEditarOBorrar && (
                          <EditarSalidaModal
                            salida={{
                              id: r.id,
                              curso: r.curso,
                              tipo: r.tipo,
                              actividad: r.actividad,
                              fecha: r.fecha,
                              horaSalida: r.horaSalida,
                              horaVuelta: r.horaVuelta,
                              responsableId: r.responsableId,
                              departamentoId: r.departamentoId,
                              numAlumnos: r.numAlumnos,
                              costo: r.costo,
                              moneda: r.moneda,
                              observaciones: r.observaciones,
                              profesoresIds: r.profesoresIds,
                            }}
                            profesores={profesores}
                          />
                        )}
                        {puedeEditarOBorrar && (
                          <button
                            onClick={() => handleDelete(r.id, r.actividad)}
                            disabled={isPending}
                            title={translate(locale, "common.eliminar")}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
