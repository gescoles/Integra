"use client";

import { useMemo } from "react";

type Aula = {
  id: string;
  nombre: string;
  x: number;
  z: number;
  ancho: number;
  profundo: number;
  alto: number;
  color: string;
  tieneReservaHoy: boolean;
  bloqueada: boolean;
};

const ESCALA = 46;

function Sala({
  aula,
  onSelect,
  seleccionada,
}: {
  aula: Aula;
  onSelect: (id: string) => void;
  seleccionada: boolean;
}) {
  const x = aula.x * ESCALA;
  const z = aula.z * ESCALA;
  const w = aula.ancho * ESCALA;
  const h = aula.profundo * ESCALA;
  const colorBase = aula.bloqueada ? "#94A3B8" : aula.color;
  const trazo = aula.bloqueada ? "#DC2626" : seleccionada ? "#FD5249" : "#1E293B";
  const grosorTrazo = seleccionada ? 3 : 1.5;

  return (
    <g
      onClick={() => onSelect(aula.id)}
      className="cursor-pointer transition-opacity hover:opacity-90"
      style={{ opacity: aula.bloqueada ? 0.6 : 1 }}
    >
      <rect
        x={x}
        y={z}
        width={w}
        height={h}
        rx={4}
        fill={colorBase}
        fillOpacity={seleccionada ? 0.85 : 0.55}
        stroke={trazo}
        strokeWidth={grosorTrazo}
      />
      <foreignObject x={x + 2} y={z + 2} width={Math.max(w - 4, 0)} height={Math.max(h - 4, 0)}>
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden px-1 text-center font-bold leading-tight text-[#0B1D4D]"
          style={{ fontSize: Math.max(11, Math.min(13, w / 7)) }}
        >
          <span className="w-full min-w-0 truncate">{aula.bloqueada ? `🔒 ${aula.nombre}` : aula.nombre}</span>
        </div>
      </foreignObject>
      {aula.tieneReservaHoy && !aula.bloqueada && (
        <circle cx={x + w - 10} cy={z + 10} r={5} fill="#FD5249" stroke="white" strokeWidth={1.5} />
      )}
    </g>
  );
}

export function Plano3D({
  aulas,
  onSelectAula,
  aulaSeleccionadaId,
}: {
  aulas: Aula[];
  onSelectAula: (id: string) => void;
  aulaSeleccionadaId: string | null;
}) {
  const viewBox = useMemo(() => {
    if (aulas.length === 0) return "0 0 400 300";
    const maxX = Math.max(...aulas.map((a) => a.x + a.ancho)) * ESCALA;
    const maxZ = Math.max(...aulas.map((a) => a.z + a.profundo)) * ESCALA;
    const pad = 30;
    return `${-pad} ${-pad} ${maxX + pad * 2} ${maxZ + pad * 2}`;
  }, [aulas]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <svg viewBox={viewBox} className="h-[420px] w-full">
        {aulas.map((aula) => (
          <Sala key={aula.id} aula={aula} onSelect={onSelectAula} seleccionada={aula.id === aulaSeleccionadaId} />
        ))}
      </svg>
    </div>
  );
}
