"use client";

import { useCallback, useState } from "react";
import { Lock } from "lucide-react";
import { NowIndicator } from "./NowIndicator";

export type BloqueVisual = {
  id: string;
  columna: number; // índice de la columna (0-based)
  horaInicio: string;
  horaFin: string;
  titulo: string;
  subtitulo?: string;
  color?: string;
  atenuado?: boolean;
};

const ROW_HEIGHT = 48;

function minutosDesde(hhmm: string, horaInicio: number) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h - horaInicio) * 60 + m;
}
function hhmmDesdeMinutos(mins: number, horaInicio: number) {
  const totalMin = horaInicio * 60 + mins;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calendario semanal con selección de horas por arrastre, a precisión de
 * 1 hora. Solo se puede seleccionar dentro de las franjas ya programadas
 * (marcadas como habilitadas por columna); todo lo demás sale bloqueado
 * con un candado, hora por hora, no solo el día entero.
 */
export function WeeklyDragGrid({
  columnas,
  horaInicio = 8,
  horaFin = 20,
  bloques,
  onSeleccion,
  colorSeleccion = "#FD5249",
}: {
  columnas: { key: string | number; label: string; destacada?: boolean; bloqueada?: boolean; motivoBloqueo?: string; slotsHabilitados?: boolean[] }[];
  horaInicio?: number;
  horaFin?: number;
  bloques: BloqueVisual[];
  onSeleccion: (columna: number, horaInicioSel: string, horaFinSel: string) => void;
  colorSeleccion?: string;
}) {
  const [arrastrando, setArrastrando] = useState<{ columna: number; inicio: number; actual: number } | null>(null);

  const horas = Array.from({ length: horaFin - horaInicio + 1 }, (_, i) => horaInicio + i);
  const numSlots = horaFin - horaInicio;
  const gridHeight = numSlots * ROW_HEIGHT;

  const slotHabilitado = useCallback(
    (columna: number, slot: number) => {
      const col = columnas[columna];
      if (!col || col.bloqueada) return false;
      if (!col.slotsHabilitados) return true;
      return Boolean(col.slotsHabilitados[slot]);
    },
    [columnas]
  );

  const slotDesdeY = useCallback(
    (y: number) => {
      const slot = Math.floor(y / ROW_HEIGHT);
      return Math.min(Math.max(slot, 0), numSlots - 1);
    },
    [numSlots]
  );

  function iniciarArrastre(columna: number, e: React.MouseEvent | React.TouchEvent) {
    const columnaEl = e.currentTarget as HTMLElement;
    const rect = columnaEl.getBoundingClientRect();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const y = clientY - rect.top;
    const slot = slotDesdeY(y);
    if (!slotHabilitado(columna, slot)) return;
    setArrastrando({ columna, inicio: slot, actual: slot });
  }

  function actualizarArrastre(e: React.MouseEvent | React.TouchEvent) {
    if (!arrastrando) return;
    const columnaEl = e.currentTarget as HTMLElement;
    const rect = columnaEl.getBoundingClientRect();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const y = clientY - rect.top;
    const slotBruto = slotDesdeY(y);

    // No se puede extender el arrastre más allá de huecos sin clase: se
    // para justo en el último slot habilitado y contiguo al inicio.
    const paso = slotBruto >= arrastrando.inicio ? 1 : -1;
    let limite = arrastrando.inicio;
    for (let s = arrastrando.inicio; paso > 0 ? s <= slotBruto : s >= slotBruto; s += paso) {
      if (!slotHabilitado(arrastrando.columna, s)) break;
      limite = s;
    }
    setArrastrando((prev) => (prev ? { ...prev, actual: limite } : prev));
  }

  function finalizarArrastre() {
    if (!arrastrando) return;
    const desde = Math.min(arrastrando.inicio, arrastrando.actual);
    const hasta = Math.max(arrastrando.inicio, arrastrando.actual) + 1;
    const hIni = hhmmDesdeMinutos(desde * 60, horaInicio);
    const hFin = hhmmDesdeMinutos(hasta * 60, horaInicio);
    onSeleccion(arrastrando.columna, hIni, hFin);
    setArrastrando(null);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 select-none">
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `44px repeat(${columnas.length}, minmax(0, 1fr))` }}>
        <div className="border-b border-r border-slate-100" />
        {columnas.map((c) => (
          <div
            key={c.key}
            className={`border-b border-r border-slate-100 px-2 py-2 text-center last:border-r-0 ${c.destacada ? "bg-blue-50/50" : ""} ${c.bloqueada ? "bg-slate-50" : ""}`}
          >
            <span className={`flex items-center justify-center gap-1 truncate text-[11px] font-bold ${c.bloqueada ? "text-slate-400" : c.destacada ? "text-[#FD5249]" : "text-[#0B1D4D]"}`}>
              {c.bloqueada && <Lock className="h-3 w-3" />}
              {c.label}
            </span>
          </div>
        ))}

        <div className="relative border-r border-slate-100" style={{ height: gridHeight }}>
          {horas.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 w-full pr-1.5 text-right text-[10px] text-slate-400"
              style={{ top: i * ROW_HEIGHT - 6 }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {columnas.map((c, colIdx) => (
          <div
            key={c.key}
            title={c.bloqueada ? c.motivoBloqueo : undefined}
            className={`relative border-r border-slate-100 last:border-r-0 ${c.bloqueada ? "bg-slate-50" : ""}`}
            style={{ height: gridHeight }}
            onMouseDown={(e) => iniciarArrastre(colIdx, e)}
            onMouseMove={(e) => actualizarArrastre(e)}
            onMouseUp={finalizarArrastre}
            onMouseLeave={() => arrastrando?.columna === colIdx && finalizarArrastre()}
            onTouchStart={(e) => iniciarArrastre(colIdx, e)}
            onTouchMove={(e) => actualizarArrastre(e)}
            onTouchEnd={finalizarArrastre}
          >
            {horas.map((h, i) => {
              if (i >= numSlots) return null;
              const habilitado = slotHabilitado(colIdx, i);
              return (
                <div
                  key={h}
                  className={`pointer-events-none absolute w-full border-t border-slate-100 ${
                    !c.bloqueada && !habilitado ? "bg-slate-50" : ""
                  }`}
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  {!c.bloqueada && !habilitado && (
                    <div className="flex h-full items-center justify-center">
                      <Lock className="h-3 w-3 text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}

            {c.destacada && <NowIndicator hourStart={horaInicio} hourEnd={horaFin} rowHeight={ROW_HEIGHT} />}

            {c.bloqueada && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Lock className="h-5 w-5 text-slate-300" />
              </div>
            )}

            {bloques
              .filter((b) => b.columna === colIdx)
              .map((b) => {
                const top = (minutosDesde(b.horaInicio, horaInicio) / 60) * ROW_HEIGHT;
                const alto = Math.max((minutosDesde(b.horaFin, horaInicio) - minutosDesde(b.horaInicio, horaInicio)) / 60, 0.4) * ROW_HEIGHT;
                return (
                  <div
                    key={b.id}
                    className={`pointer-events-none absolute left-1 right-1 rounded-lg border px-2 py-1 text-[11px] ${
                      b.atenuado ? "opacity-50" : ""
                    }`}
                    style={{
                      top,
                      height: alto,
                      backgroundColor: `${b.color ?? "#2F6FED"}1A`,
                      borderColor: b.color ?? "#2F6FED",
                    }}
                  >
                    <div className="truncate font-bold" style={{ color: b.color ?? "#2F6FED" }}>
                      {b.titulo}
                    </div>
                    {b.subtitulo && <div className="truncate text-slate-500">{b.subtitulo}</div>}
                  </div>
                );
              })}

            {arrastrando?.columna === colIdx && (
              <div
                className="pointer-events-none absolute left-1 right-1 rounded-lg border-2 border-dashed"
                style={{
                  top: Math.min(arrastrando.inicio, arrastrando.actual) * ROW_HEIGHT,
                  height: (Math.abs(arrastrando.actual - arrastrando.inicio) + 1) * ROW_HEIGHT,
                  backgroundColor: `${colorSeleccion}26`,
                  borderColor: colorSeleccion,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
