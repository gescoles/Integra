"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronDown, ShieldCheck } from "lucide-react";
import { eliminarEventoCalendarioEscolar, actualizarPermisoCalendarioEscolar } from "./escolarActions";
import { CalendarioEscolarEventoModal, type EventoEditable } from "./CalendarioEscolarEventoModal";

export type EventoEscolar = {
  id: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  festivo: boolean;
  creadoPorNombre: string;
};

export type ProfesorPermiso = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  puedeEditarCalendarioEscolar: boolean;
};

function formatRango(inicioIso: string, finIso: string): string {
  const inicio = new Date(inicioIso);
  const fin = new Date(finIso);
  const mismoDia = inicio.toDateString() === fin.toDateString();
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (mismoDia) return inicio.toLocaleDateString("es-ES", opts);
  const mismoMes = inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear();
  const inicioStr = inicio.toLocaleDateString("es-ES", mismoMes ? { day: "numeric" } : opts);
  const finStr = fin.toLocaleDateString("es-ES", opts);
  return `${inicioStr} - ${finStr}`;
}

function claveMes(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function tituloMes(iso: string): string {
  const d = new Date(iso);
  const s = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CalendarioEscolarClient({
  eventos,
  eventosEstaSemana,
  semanaLabel,
  puedeEditar,
  esSuperAdmin,
  schoolId,
  profesores,
}: {
  eventos: EventoEscolar[];
  eventosEstaSemana: EventoEscolar[];
  semanaLabel: string;
  puedeEditar: boolean;
  esSuperAdmin: boolean;
  schoolId?: string;
  profesores?: ProfesorPermiso[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<{ editing: EventoEditable | null } | null>(null);
  const [permisosAbierto, setPermisosAbierto] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const mapa = new Map<string, EventoEscolar[]>();
    for (const e of eventos) {
      const k = claveMes(e.fechaInicio);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(e);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [eventos]);

  async function handleEliminar(e: EventoEscolar) {
    if (!confirm(`¿Eliminar "${e.titulo}"?`)) return;
    try {
      await eliminarEventoCalendarioEscolar(e.id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  async function handleTogglePermiso(userId: string, actual: boolean) {
    setPendingUserId(userId);
    try {
      await actualizarPermisoCalendarioEscolar(userId, !actual);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo cambiar el permiso.");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-2.5 text-xs font-semibold text-slate-500">
          Semana actual: <span className="text-[#0B1D4D]">{semanaLabel}</span>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setModal({ editing: null })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            <Plus className="h-4 w-4" /> Nueva fecha
          </button>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-[#0B1D4D]">Esta semana</h3>
        {eventosEstaSemana.length === 0 ? (
          <p className="text-sm text-slate-400">No hay nada marcado en el calendario escolar para esta semana.</p>
        ) : (
          <div className="space-y-2">
            {eventosEstaSemana.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <span className="w-28 shrink-0 text-xs font-semibold text-slate-500">
                  {formatRango(e.fechaInicio, e.fechaFin)}
                </span>
                <span className="flex-1 text-sm text-slate-700">{e.titulo}</span>
                {e.festivo && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    FESTIU
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {esSuperAdmin && profesores && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white">
          <button
            onClick={() => setPermisosAbierto((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#FD5249]" />
              <span className="text-sm font-bold text-[#0B1D4D]">Permisos de edición para profesores</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${permisosAbierto ? "rotate-180" : ""}`} />
          </button>
          {permisosAbierto && (
            <div className="border-t border-slate-100 p-5 pt-4">
              <p className="mb-3 text-xs text-slate-400">
                Por defecto solo SuperAdmin puede modificar el calendario escolar. Activa el interruptor para dar
                permiso de edición a un usuario concreto de este centro.
              </p>
              {profesores.length === 0 ? (
                <p className="text-sm text-slate-400">Este centro todavía no tiene usuarios registrados.</p>
              ) : (
                <div className="space-y-1.5">
                  {profesores.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-700">{p.name ?? p.email}</div>
                        <div className="truncate text-xs text-slate-400">{p.email}</div>
                      </div>
                      <button
                        onClick={() => handleTogglePermiso(p.id, p.puedeEditarCalendarioEscolar)}
                        disabled={pendingUserId === p.id}
                        className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-60 ${
                          p.puedeEditarCalendarioEscolar ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-white transition-transform ${
                            p.puedeEditarCalendarioEscolar ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Todavía no hay ninguna fecha marcada en el calendario escolar.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([mes, items]) => (
            <div key={mes}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">{tituloMes(items[0].fechaInicio)}</h3>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {items.map((e, i) => (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 px-5 py-3 ${i > 0 ? "border-t border-slate-50" : ""} ${
                      e.festivo ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    <span className="w-28 shrink-0 text-xs font-semibold text-slate-500">
                      {formatRango(e.fechaInicio, e.fechaFin)}
                    </span>
                    <span className="flex-1 text-sm text-slate-700">{e.titulo}</span>
                    {e.festivo && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        FESTIU
                      </span>
                    )}
                    {puedeEditar && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() =>
                            setModal({
                              editing: {
                                id: e.id,
                                titulo: e.titulo,
                                fechaInicio: e.fechaInicio,
                                fechaFin: e.fechaFin,
                                festivo: e.festivo,
                              },
                            })
                          }
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEliminar(e)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CalendarioEscolarEventoModal schoolId={schoolId} editing={modal.editing} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
