"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight, ChevronLeft, Heart, MessageCircle } from "lucide-react";
import { Reveal } from "./Reveal";

// Pequeñas siluetas para que cada historia parezca una foto de una
// actividad real (salida, teatro, laboratorio...) sin usar fotos de
// alumnos de verdad: son escenas ilustradas, claramente de ejemplo.
function EscenaSalida() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      <rect width="200" height="130" fill="#7DD3FC" />
      <rect y="130" width="200" height="70" fill="#86EFAC" />
      <circle cx="160" cy="40" r="18" fill="#FEF08A" />
      <rect x="20" y="90" width="100" height="45" rx="8" fill="#FDE047" />
      <rect x="20" y="90" width="100" height="20" fill="#FACC15" />
      <circle cx="40" cy="140" r="10" fill="#334155" />
      <circle cx="100" cy="140" r="10" fill="#334155" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={140 + i * 18} cy="168" r="8" fill="#FED7AA" />
          <rect x={134 + i * 18} y="176" width="12" height="20" rx="4" fill={["#FD5249", "#34D399", "#60A5FA"][i]} />
        </g>
      ))}
    </svg>
  );
}
function EscenaTeatro() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      <rect width="200" height="200" fill="#1E1B4B" />
      <rect x="0" y="0" width="30" height="200" fill="#7F1D1D" />
      <rect x="170" y="0" width="30" height="200" fill="#7F1D1D" />
      <ellipse cx="100" cy="150" rx="90" ry="14" fill="#312E81" opacity="0.6" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={70 + i * 30} cy="120" r="10" fill="#FBCFE8" />
          <rect x={62 + i * 30} y="130" width="16" height="26" rx="5" fill={["#FD5249", "#FBBF24", "#34D399"][i]} />
        </g>
      ))}
      <circle cx="100" cy="45" r="30" fill="#FDE68A" opacity="0.9" />
    </svg>
  );
}
function EscenaLaboratorio() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      <rect width="200" height="200" fill="#EDE9FE" />
      <rect y="140" width="200" height="60" fill="#C4B5FD" />
      <rect x="50" y="70" width="14" height="60" fill="#A78BFA" />
      <path d="M50 100 L36 140 H78 L64 100 Z" fill="#8B5CF6" opacity="0.8" />
      <circle cx="46" cy="118" r="4" fill="#FD5249" />
      <circle cx="60" cy="112" r="3" fill="#34D399" />
      <circle cx="130" cy="150" r="9" fill="#FED7AA" />
      <rect x="122" y="159" width="16" height="24" rx="5" fill="#60A5FA" />
    </svg>
  );
}
function EscenaDeportes() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      <rect width="200" height="200" fill="#BBF7D0" />
      <rect y="0" width="200" height="80" fill="#7DD3FC" />
      <circle cx="100" cy="120" r="16" fill="#fff" stroke="#334155" strokeWidth="2" />
      <path d="M100 108 L108 118 L100 128 L92 118 Z" fill="#334155" />
      {[0, 1].map((i) => (
        <g key={i}>
          <circle cx={60 + i * 90} cy="150" r="9" fill="#FED7AA" />
          <rect x={52 + i * 90} y="159" width="16" height="24" rx="5" fill={i === 0 ? "#FD5249" : "#60A5FA"} />
        </g>
      ))}
    </svg>
  );
}
function EscenaGraduacion() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      <rect width="200" height="200" fill="#FEF3C7" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={55 + i * 45} cy="150" r="10" fill="#FED7AA" />
          <rect x={47 + i * 45} y="159" width="16" height="26" rx="5" fill="#1E1B4B" />
          <rect x={44 + i * 45} y="136" width="22" height="6" fill="#1E1B4B" />
          <rect x={53 + i * 45} y="128" width="4" height="10" fill="#1E1B4B" />
        </g>
      ))}
      {[30, 70, 110, 150, 170].map((x, i) => (
        <rect key={i} x={x} y={30 + (i % 2) * 20} width="6" height="6" fill={["#FD5249", "#34D399", "#60A5FA", "#FBBF24", "#A78BFA"][i]} transform={`rotate(20 ${x} 30)`} />
      ))}
    </svg>
  );
}

const HISTORIAS_EJEMPLO = [
  { centro: "IES Maresme", texto: "Salida al teatro con 2º de ESO 🎭", Escena: EscenaTeatro, colorAcento: "#7F1D1D" },
  { centro: "Colegio Horizonte", texto: "Final del torneo de fútbol ⚽", Escena: EscenaDeportes, colorAcento: "#16A34A" },
  { centro: "Instituto del Mirador", texto: "Práctica en el laboratorio 🔬", Escena: EscenaLaboratorio, colorAcento: "#7C3AED" },
  { centro: "Centro Joven Esperanza", texto: "Graduación de 2º de Bachillerato 🎓", Escena: EscenaGraduacion, colorAcento: "#D97706" },
  { centro: "Escola Vidra", texto: "Excursión al museo de la ciencia 🚌", Escena: EscenaSalida, colorAcento: "#0284C7" },
];

function VisorHistoria({
  index,
  onClose,
  onSiguiente,
  onAnterior,
}: {
  index: number;
  onClose: () => void;
  onSiguiente: () => void;
  onAnterior: () => void;
}) {
  const historia = HISTORIAS_EJEMPLO[index];
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    setProgreso(0);
    const inicio = Date.now();
    const duracion = 4000;
    const id = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - inicio) / duracion) * 100);
      setProgreso(pct);
      if (pct >= 100) {
        clearInterval(id);
        onSiguiente();
      }
    }, 40);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative flex h-[520px] w-[300px] flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0">
          <historia.Escena />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40" />
        </div>

        <div className="absolute left-2 right-2 top-2 z-10 flex gap-1">
          {HISTORIAS_EJEMPLO.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{ width: i < index ? "100%" : i === index ? `${progreso}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-6 flex items-center gap-2 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white backdrop-blur">
            {historia.centro.charAt(0)}
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">{historia.centro}</span>
        </div>

        <div className="relative z-10 mt-auto px-5 pb-16">
          <p className="text-lg font-bold text-white drop-shadow">{historia.texto}</p>
        </div>

        <div className="relative z-10 flex items-center justify-between px-4 pb-4 text-white/90">
          <span className="flex items-center gap-1 text-xs"><Heart className="h-4 w-4" /> 24</span>
          <span className="flex items-center gap-1 text-xs"><MessageCircle className="h-4 w-4" /> 6</span>
        </div>

        <button onClick={onClose} className="absolute right-2 top-9 z-10 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50">
          <X className="h-4 w-4" />
        </button>
        <button onClick={onAnterior} className="absolute left-0 top-1/2 z-10 -translate-y-1/2 p-2 text-white/70 hover:text-white">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button onClick={onSiguiente} className="absolute right-0 top-1/2 z-10 -translate-y-1/2 p-2 text-white/70 hover:text-white">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export function HistoriasDemo() {
  const [abierta, setAbierta] = useState<number | null>(null);

  function siguiente() {
    setAbierta((i) => {
      if (i === null) return null;
      return i + 1 < HISTORIAS_EJEMPLO.length ? i + 1 : null;
    });
  }
  function anterior() {
    setAbierta((i) => (i === null ? null : Math.max(0, i - 1)));
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <Reveal className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#FD5249]">
          📸 Comunidad conectada
        </span>
        <h2 className="mt-3 text-2xl font-bold text-[#0B1D4D] sm:text-3xl">Historias entre centros</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Como en tus redes favoritas: cada centro comparte fotos y vídeos cortos de
          salidas, actividades y momentos del día a día que desaparecen a las 24h.
        </p>
      </Reveal>

      <Reveal delay={150}>
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {HISTORIAS_EJEMPLO.map((h, i) => (
            <button
              key={h.centro}
              onClick={() => setAbierta(i)}
              className="flex flex-col items-center gap-2 transition-transform hover:-translate-y-1"
            >
              <div className="rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${h.colorAcento}, #FD5249)` }}>
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white">
                  <h.Escena />
                </div>
              </div>
              <span className="max-w-[90px] truncate text-xs font-semibold text-slate-600">{h.centro}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Escenas ilustradas de ejemplo &mdash; toca cualquier círculo para probarlo</p>
      </Reveal>

      {abierta !== null && (
        <VisorHistoria index={abierta} onClose={() => setAbierta(null)} onSiguiente={siguiente} onAnterior={anterior} />
      )}
    </section>
  );
}
