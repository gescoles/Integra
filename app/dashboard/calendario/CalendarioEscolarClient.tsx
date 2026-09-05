"use client";

import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { CalendarioEscolarEventoModal, type EventoEditable } from "./CalendarioEscolarEventoModal";
import { PermisosCalendarioModal } from "./PermisosCalendarioModal";

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

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function inicioDeSemana(d: Date): Date {
  const date = new Date(d);
  const dia = date.getDay(); // 0=domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mismoDia(a: Date, b: Date): boolean {
  return isoDate(a) === isoDate(b);
}

export function CalendarioEscolarClient({
  eventos,
  puedeEditar,
  esSuperAdmin,
  schoolId,
  profesores,
}: {
  eventos: EventoEscolar[];
  puedeEditar: boolean;
  esSuperAdmin: boolean;
  schoolId?: string;
  profesores?: ProfesorPermiso[];
}) {
  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [vista, setVista] = useState<"mes" | "semana">("mes");
  const [cursor, setCursor] = useState<Date>(hoy);
  const [modal, setModal] = useState<{ editing: EventoEditable | null; fecha?: string } | null>(null);
  const [permisosModalAbierto, setPermisosModalAbierto] = useState(false);

  const eventosPorFecha = useMemo(() => {
    const parsed = eventos.map((e) => ({ ...e, inicio: new Date(e.fechaInicio), fin: new Date(e.fechaFin) }));
    return (dia: Date) => parsed.filter((e) => e.inicio <= dia && e.fin >= dia);
  }, [eventos]);

  const diasAMostrar: Date[] = useMemo(() => {
    if (vista === "semana") {
      const lunes = inicioDeSemana(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(lunes, i));
    }
    const primerDiaMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const inicio = inicioDeSemana(primerDiaMes);
    return Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  }, [vista, cursor]);

  function irAnterior() {
    setCursor((c) => (vista === "semana" ? addDays(c, -7) : new Date(c.getFullYear(), c.getMonth() - 1, 1)));
  }
  function irSiguiente() {
    setCursor((c) => (vista === "semana" ? addDays(c, 7) : new Date(c.getFullYear(), c.getMonth() + 1, 1)));
  }
  function irHoy() {
    setCursor(hoy);
  }

  function abrirNuevo(fecha: Date) {
    if (!puedeEditar) return;
    setModal({ editing: null, fecha: isoDate(fecha) });
  }

  function abrirEditar(e: EventoEscolar) {
    if (!puedeEditar) return;
    setModal({
      editing: { id: e.id, titulo: e.titulo, fechaInicio: e.fechaInicio, fechaFin: e.fechaFin, festivo: e.festivo },
    });
  }

  const etiquetaCabecera =
    vista === "mes"
      ? cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
      : `${diasAMostrar[0].toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${diasAMostrar[6].toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={irAnterior} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-slate-600">{etiquetaCabecera}</span>
          <button onClick={irSiguiente} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={irHoy} className="ml-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#FD5249] hover:bg-blue-50">
            Hoy
          </button>
          <div className="ml-2 inline-flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setVista("mes")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${vista === "mes" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
            >
              Mes
            </button>
            <button
              onClick={() => setVista("semana")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${vista === "semana" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
            >
              Semana
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {esSuperAdmin && profesores && (
            <button
              onClick={() => setPermisosModalAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4 text-[#FD5249]" /> Dar permiso
            </button>
          )}
          {puedeEditar && (
            <button
              onClick={() => abrirNuevo(hoy)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
            >
              <Plus className="h-4 w-4" /> Nueva fecha
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="border-r border-slate-100 px-2 py-2 text-center text-[11px] font-bold uppercase text-slate-400 last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${vista === "mes" ? "grid-rows-6" : ""}`}>
          {diasAMostrar.map((dia, i) => {
            const eventosDelDia = eventosPorFecha(dia);
            const esDelMes = vista === "semana" || dia.getMonth() === cursor.getMonth();
            const esHoy = mismoDia(dia, hoy);
            const visibles = vista === "semana" ? eventosDelDia : eventosDelDia.slice(0, 3);
            const restantes = eventosDelDia.length - visibles.length;

            return (
              <div
                key={i}
                onClick={() => abrirNuevo(dia)}
                className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 [&:nth-child(7n)]:border-r-0 ${
                  esDelMes ? "bg-white" : "bg-slate-50/60"
                } ${puedeEditar ? "cursor-pointer hover:bg-blue-50/30" : ""}`}
              >
                <div
                  className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                    esHoy ? "bg-[#FD5249] text-white" : esDelMes ? "text-slate-600" : "text-slate-300"
                  }`}
                >
                  {dia.getDate()}
                </div>
                <div className="space-y-1">
                  {visibles.map((e) => (
                    <div
                      key={e.id}
                      title={e.titulo}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        abrirEditar(e);
                      }}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        e.festivo ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-[#0B1D4D]"
                      } ${puedeEditar ? "hover:brightness-95" : ""}`}
                    >
                      {e.titulo}
                    </div>
                  ))}
                  {restantes > 0 && <div className="px-1.5 text-[10px] font-semibold text-slate-400">+{restantes} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <CalendarioEscolarEventoModal
          schoolId={schoolId}
          editing={modal.editing}
          defaultFecha={modal.fecha}
          onClose={() => setModal(null)}
        />
      )}

      {permisosModalAbierto && profesores && (
        <PermisosCalendarioModal profesores={profesores} onClose={() => setPermisosModalAbierto(false)} />
      )}
    </div>
  );
}
