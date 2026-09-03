"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Newspaper } from "lucide-react";

type ItemCarrusel = {
  slug: string;
  titulo: string;
  resumen: string;
  imagenPortada: string | null;
  etiqueta: string;
  publishedAt: string;
};

const DURACION_MS = 5000;

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export function NoticiasHeroCarousel({ items }: { items: ItemCarrusel[] }) {
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || pausado) return;
    const id = setInterval(() => setActivo((i) => (i + 1) % items.length), DURACION_MS);
    return () => clearInterval(id);
  }, [items.length, pausado]);

  if (items.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-6">
      <section
        className="relative h-[380px] w-full overflow-hidden rounded-3xl bg-[#0B1D4D] shadow-lg sm:h-[440px] lg:h-[520px]"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
      >
        {items.map((n, i) => (
          <Link
            key={n.slug}
            href={`/noticias/${n.slug}`}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === activo ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
          >
            {n.imagenPortada ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.imagenPortada} alt={n.titulo} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0B1D4D] to-[#1a3a7a]">
                <Newspaper className="h-16 w-16 text-white/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#0B1D4D]">
                {n.etiqueta}
              </span>
              <h2 className="max-w-3xl text-2xl font-black leading-tight text-white drop-shadow sm:text-3xl lg:text-4xl">
                {n.titulo}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">{n.resumen}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/60">
                <Calendar className="h-3.5 w-3.5" /> {formatFecha(n.publishedAt)}
              </span>
            </div>
          </Link>
        ))}

        {items.length > 1 && (
          <div className="absolute left-0 right-0 top-0 z-20 flex gap-1.5 p-5">
            {items.map((n, i) => (
              <button
                key={n.slug}
                onClick={(e) => {
                  e.preventDefault();
                  setActivo(i);
                }}
                aria-label={`Ver noticia ${i + 1}`}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className={`h-full bg-white ${i === activo && !pausado ? "animate-[avance_5s_linear_forwards]" : ""}`}
                  style={{ width: i < activo ? "100%" : i === activo ? (pausado ? "50%" : undefined) : "0%" }}
                />
              </button>
            ))}
          </div>
        )}

        <style>{`
          @keyframes avance {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </section>
    </div>
  );
}
