"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Pencil, Trash2 } from "lucide-react";
import { updateGuardiaStatus, eliminarGuardiaProgramada } from "./actions";
import { EditarGuardiaModal } from "./EditarGuardiaModal";
import { GUARDIA_STATUS_LABELS, GUARDIA_STATUS_COLORS, GUARDIA_STATUS_OPTIONS } from "../constants";
import { useLocale, useGuardadoTransition } from "../SchoolContext";
import { translate } from "../i18n";

type Row = {
  id: string;
  turno: string;
  ubicacion: string | null;
  grupo: string | null;
  tarea: string | null;
  status: string;
  fecha: string;
  profesorId: string;
  profesorName: string;
  origen: "guardia" | "cobertura";
};

type ProfesorOption = { id: string; name: string };

export function GuardiasClient({
  rows,
  profesores,
}: {
  rows: Row[];
  profesores: ProfesorOption[];
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [profesorFilter, setProfesorFilter] = useState("Todos");
  const [isPending, startTransition] = useGuardadoTransition();
  const [editando, setEditando] = useState<{ id: string; origen: "guardia" | "cobertura" } | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !r.turno.toLowerCase().includes(q) &&
        !(r.ubicacion ?? "").toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "Todos" && r.status !== statusFilter) return false;
      if (profesorFilter !== "Todos" && r.profesorId !== profesorFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter, profesorFilter]);

  function handleStatusChange(id: string, status: string) {
    startTransition(() => {
      updateGuardiaStatus(id, status as never);
    });
  }

  async function handleEliminar(row: Row) {
    setBorrando(row.id);
    try {
      await eliminarGuardiaProgramada(row.id, row.origen);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBorrando(null);
      setConfirmandoBorrar(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(locale, "guardias.buscarPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
        >
          <option value="Todos">{translate(locale, "guardias.todosEstados")}</option>
          {GUARDIA_STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {translate(locale, `status.${value}` as never)}
            </option>
          ))}
        </select>
        <select
          value={profesorFilter}
          onChange={(e) => setProfesorFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
        >
          <option value="Todos">{translate(locale, "guardias.todosProfesores")}</option>
          {profesores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          {translate(locale, "guardias.sinResultados")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colTurno")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colProfesor")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colGrupo")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colUbicacion")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colFecha")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colEstado")}</th>
                <th className="pb-2 font-medium text-right">{translate(locale, "common.acciones")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-3 font-semibold text-slate-700" title={r.tarea ?? undefined}>
                    {r.turno}
                    {r.tarea && <div className="mt-0.5 max-w-[220px] truncate text-[10px] font-normal text-slate-400">{r.tarea}</div>}
                  </td>
                  <td className="py-3 pr-3 text-slate-500">{r.profesorName}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.grupo ?? "—"}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.ubicacion ?? "—"}</td>
                  <td className="py-3 pr-3 text-slate-400">
                    {new Date(r.fecha).toLocaleDateString("es-ES")}
                  </td>
                  <td className="py-3 pr-3">
                    {r.origen === "guardia" ? (
                      <select
                        defaultValue={r.status}
                        disabled={isPending}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none ${GUARDIA_STATUS_COLORS[r.status]}`}
                      >
                        {GUARDIA_STATUS_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {translate(locale, `status.${value}` as never)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${GUARDIA_STATUS_COLORS[r.status]}`}>
                        {GUARDIA_STATUS_LABELS[r.status]}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditando({ id: r.id, origen: r.origen })}
                        title={translate(locale, "guardias.editarGuardia")}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmandoBorrar(r)}
                        title={r.origen === "cobertura" ? "Anular guardia" : translate(locale, "common.eliminar")}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-400">
        Mostrando {filtered.length} de {rows.length} guardias
      </div>

      {editando && (
        <EditarGuardiaModal
          id={editando.id}
          origen={editando.origen}
          profesores={profesores}
          onClose={() => setEditando(null)}
        />
      )}

      {confirmandoBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#0B1D4D]">
              {confirmandoBorrar.origen === "cobertura" ? "Anular guardia" : translate(locale, "guardias.confirmarEliminar")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {confirmandoBorrar.origen === "cobertura"
                ? "Se avisará por email de que ya no hace falta ir a esta guardia a "
                : translate(locale, "guardias.confirmarEliminarTexto") + " "}
              <strong className="text-slate-700">{confirmandoBorrar.profesorName}</strong>.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmandoBorrar(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                {translate(locale, "common.cancelar")}
              </button>
              <button
                onClick={() => handleEliminar(confirmandoBorrar)}
                disabled={borrando === confirmandoBorrar.id}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {borrando === confirmandoBorrar.id
                  ? translate(locale, "common.eliminando")
                  : confirmandoBorrar.origen === "cobertura" ? "Anular" : translate(locale, "common.eliminar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
