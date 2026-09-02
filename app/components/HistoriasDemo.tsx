"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight, ChevronLeft, Heart, MessageCircle } from "lucide-react";
import { Reveal } from "./Reveal";

// Fotos reales de archivo (Unsplash, licencia libre de derechos —
// no requieren atribución ni pago) que ilustran, a modo de ejemplo,
// el tipo de actividades que los centros comparten en sus historias.
// No son fotos de alumnos reales de ningún centro de la plataforma.
function Foto({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

const HISTORIAS_EJEMPLO = [
  {
    centro: "IES Maresme",
    texto: "Ensayo de la obra de teatro con 2º de Bachillerato 🎭",
    foto: "https://images.unsplash.com/photo-1630050525402-06c617847d27?w=800&q=80&auto=format&fit=crop",
    colorAcento: "#7F1D1D",
  },
  {
    centro: "Colegio Horizonte",
    texto: "Final del torneo de baloncesto 🏀",
    foto: "https://images.unsplash.com/photo-1616353352910-15d970ac020b?w=800&q=80&auto=format&fit=crop",
    colorAcento: "#16A34A",
  },
  {
    centro: "Instituto del Mirador",
    texto: "Práctica de FP en el aula de informática 💻",
    foto: "https://images.unsplash.com/photo-1719159381981-1327b22aff9b?w=800&q=80&auto=format&fit=crop",
    colorAcento: "#7C3AED",
  },
  {
    centro: "Centro Joven Esperanza",
    texto: "Graduación de 2º de Bachillerato 🎓",
    foto: "https://images.unsplash.com/photo-1561409958-c0e6ad782a81?w=800&q=80&auto=format&fit=crop",
    colorAcento: "#D97706",
  },
  {
    centro: "Escola Vidra",
    texto: "Excursión de fin de curso 🚌",
    foto: "https://images.unsplash.com/photo-1591219233007-4ac041f8c2be?w=800&q=80&auto=format&fit=crop",
    colorAcento: "#0284C7",
  },
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
          <Foto src={historia.foto} />
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
                  <Foto src={h.foto} />
                </div>
              </div>
              <span className="max-w-[90px] truncate text-xs font-semibold text-slate-600">{h.centro}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Fotos de ejemplo &mdash; toca cualquier círculo para probarlo</p>
      </Reveal>

      {abierta !== null && (
        <VisorHistoria index={abierta} onClose={() => setAbierta(null)} onSiguiente={siguiente} onAnterior={anterior} />
      )}
    </section>
  );
}
