"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Trash2, ExternalLink, FileSpreadsheet } from "lucide-react";
import { deleteMaterial } from "./actions";
import { MaterialFormModal } from "./MaterialFormModal";
import { MATERIAL_CATEGORIA_LABELS, MATERIAL_CATEGORIA_COLORS } from "../constants";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type MaterialRow = {
  id: string;
  nombre: string;
  curso: string;
  asignatura: string;
  cantidad: number;
  precioUnidad: number;
  proveedor: string;
  enlace: string | null;
  categoria: string;
  justificacion: string;
  profesorId: string;
  profesorName: string;
};

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export function MaterialClient({
  rows,
  currentUserId,
  canManageAll = false,
  schoolId,
  showFilters = false,
}: {
  rows: MaterialRow[];
  currentUserId: string;
  canManageAll?: boolean;
  schoolId?: string;
  showFilters?: boolean;
}) {
  const [search, setSearch] = useState("");
  const { locale } = useLocale();
  const [cursoFilter, setCursoFilter] = useState("Todos");
  const [profesorFilter, setProfesorFilter] = useState("Todos");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cursos = useMemo(
    () => Array.from(new Set(rows.map((r) => r.curso))).sort(),
    [rows]
  );

  const profesores = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.profesorId, r.profesorName));
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && !r.nombre.toLowerCase().includes(q)) return false;
      if (cursoFilter !== "Todos" && r.curso !== cursoFilter) return false;
      if (profesorFilter !== "Todos" && r.profesorId !== profesorFilter) return false;
      return true;
    });
  }, [rows, search, cursoFilter, profesorFilter]);

  function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? No se puede deshacer.`)) return;
    startTransition(async () => {
      try {
        await deleteMaterial(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(locale, "material.buscarPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2F6FED]"
          />
        </div>
        <select
          value={cursoFilter}
          onChange={(e) => setCursoFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">{translate(locale, "material.todosCursos")}</option>
          {cursos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {showFilters && (
          <select
            value={profesorFilter}
            onChange={(e) => setProfesorFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
          >
            <option value="Todos">{translate(locale, "material.todosProfesores")}</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {showFilters && schoolId && (
          <a
            href={`/api/material/export?school=${schoolId}${
              profesorFilter !== "Todos" ? `&profesor=${profesorFilter}` : ""
            }`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <FileSpreadsheet className="h-4 w-4" /> {translate(locale, "material.descargarExcel")}
          </a>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          {rows.length === 0 ? translate(locale, "material.sinPeticiones") : translate(locale, "material.sinResultados")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-3 pr-4 font-medium">{translate(locale, "material.colMaterial")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "material.colCategoria")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "material.colCantidad")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "material.colPrecio")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "material.colProveedor")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "material.colSolicitadoPor")}</th>
                <th className="pb-3 font-medium">{translate(locale, "material.colAcciones")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const total = r.precioUnidad * r.cantidad;
                const isOwner = canManageAll || r.profesorId === currentUserId;
                return (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-slate-700">{r.nombre}</div>
                      <div className="text-xs text-slate-400">
                        {r.curso} · {r.asignatura}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${MATERIAL_CATEGORIA_COLORS[r.categoria]}`}
                      >
                        {translate(locale, `categoria.${r.categoria}` as never)}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{r.cantidad}</td>
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-slate-700">{eur(total)}</div>
                      <div className="text-xs text-slate-400">
                        {eur(r.precioUnidad)} / ud
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-slate-600">{r.proveedor}</div>
                      {r.enlace && (
                        <a
                          href={r.enlace}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#2F6FED] hover:underline"
                        >
                          Ver enlace <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{r.profesorName}</td>
                    <td className="py-4">
                      {isOwner ? (
                        <div className="flex items-center gap-1">
                          <MaterialFormModal userName={r.profesorName} material={r} trigger="icon" />
                          <button
                            onClick={() => handleDelete(r.id, r.nombre)}
                            disabled={isPending}
                            title="Eliminar"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-400">
        Mostrando {filtered.length} de {rows.length} materiales
      </div>
    </div>
  );
}
