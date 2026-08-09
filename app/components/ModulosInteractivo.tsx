"use client";

import { useState } from "react";
import { Calendar, AlertTriangle, Building2, FolderKanban } from "lucide-react";
import { Reveal } from "./Reveal";

const MODULOS = [
  {
    key: "tutorias",
    label: "Tutorías",
    icon: Calendar,
    color: "#3B82F6",
    titulo: "Próxima tutoría",
    filas: [
      { a: "2º ESO B · Aula 12", b: "09:30", c: "En 17 min" },
      { a: "Ana Martín (madre)", b: "Llamada", c: "Ayer, 12:05" },
      { a: "Resumen registrado", b: "Riesgo: bajo", c: "Hoy" },
    ],
  },
  {
    key: "expedientes",
    label: "Expedientes",
    icon: AlertTriangle,
    color: "#FD5249",
    titulo: "Expediente núm. 000042",
    filas: [
      { a: "3 incidencias registradas", b: "Alta prioridad", c: "Hoy" },
      { a: "Firma de Dirección", b: "✓ Firmado", c: "Hoy" },
      { a: "Enviado al tutor/a", b: "Con PDF adjunto", c: "Hace 2 min" },
    ],
  },
  {
    key: "espacios",
    label: "Reserva de Espacios",
    icon: Building2,
    color: "#6366F1",
    titulo: "Sala de tutorías",
    filas: [
      { a: "09:00 – 10:00", b: "Disponible", c: "" },
      { a: "10:00 – 11:00", b: "Reservada", c: "M. López" },
      { a: "11:00 – 12:00", b: "Disponible", c: "" },
    ],
  },
  {
    key: "onboarding",
    label: "OnBoarding",
    icon: FolderKanban,
    color: "#14B8A6",
    titulo: "Carpeta: Nuevas incorporaciones",
    filas: [
      { a: "Guía del profesorado.pdf", b: "2.1 MB", c: "Hoy" },
      { a: "Horario_curso.xlsx", b: "48 KB", c: "Ayer" },
      { a: "Aviso enviado a 24 usuarios", b: "Email + app", c: "Hoy" },
    ],
  },
];

export function ModulosInteractivo() {
  const [activo, setActivo] = useState(0);
  const modulo = MODULOS[activo];

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <Reveal className="text-center">
        <h2 className="text-2xl font-bold text-[#0B1D4D] sm:text-3xl">Pruébalo tú mismo</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Toca cada módulo y mira cómo cambia la pantalla al momento.
        </p>
      </Reveal>

      <Reveal delay={100}>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {MODULOS.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setActivo(i)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                activo === i
                  ? "scale-105 border-transparent text-white shadow-md"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
              style={activo === i ? { backgroundColor: m.color } : undefined}
            >
              <m.icon className="h-4 w-4" />
              {m.label}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={180}>
        <div
          key={modulo.key}
          className="mx-auto mt-8 max-w-lg animate-[fadeSlide_0.35s_ease-out] rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${modulo.color}1A` }}>
              <modulo.icon className="h-4 w-4" style={{ color: modulo.color }} />
            </div>
            <span className="text-sm font-bold text-[#0B1D4D]">{modulo.titulo}</span>
          </div>
          <div className="space-y-2">
            {modulo.filas.map((f) => (
              <div key={f.a} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-xs">
                <span className="font-medium text-slate-700">{f.a}</span>
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="font-semibold" style={{ color: modulo.color }}>{f.b}</span>
                  {f.c && <span>{f.c}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
