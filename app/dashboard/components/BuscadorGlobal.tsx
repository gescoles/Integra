"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, GraduationCap, User, Building2, Layers, Loader2, X, ArrowRight } from "lucide-react";
import { buscarGlobal, type ResultadoBusquedaGlobal } from "../busquedaGlobalActions";

const ICONO_POR_TIPO: Record<ResultadoBusquedaGlobal["tipo"], React.ElementType> = {
  alumno: GraduationCap,
  profesor: User,
  empresa: Building2,
  grupo: Layers,
};

const ETIQUETA_POR_TIPO: Record<ResultadoBusquedaGlobal["tipo"], string> = {
  alumno: "Alumnos",
  profesor: "Profesorado",
  empresa: "Empresas",
  grupo: "Grupos / ciclos",
};

export function BuscadorGlobal() {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusquedaGlobal[]>([]);
  const [seleccionado, setSeleccionado] = useState<ResultadoBusquedaGlobal | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    setCargando(true);
    const timeout = setTimeout(() => {
      buscarGlobal(texto)
        .then(setResultados)
        .finally(() => setCargando(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [texto]);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const grupos: Record<string, ResultadoBusquedaGlobal[]> = {};
  for (const r of resultados) {
    (grupos[r.tipo] ??= []).push(r);
  }

  const IconoSeleccionado = seleccionado ? ICONO_POR_TIPO[seleccionado.tipo] : null;

  return (
    <div ref={contenedorRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar alumno, profesor, empresa o grupo..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249] focus:bg-white"
        />
        {cargando && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-300" />}
      </div>

      {abierto && texto.trim().length >= 2 && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-96 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {!cargando && resultados.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-slate-400">Sin resultados para &quot;{texto}&quot;.</p>
          )}
          {(Object.keys(grupos) as ResultadoBusquedaGlobal["tipo"][]).map((tipo) => (
            <div key={tipo} className="mb-1 last:mb-0">
              <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{ETIQUETA_POR_TIPO[tipo]}</p>
              {grupos[tipo].map((r) => {
                const Icono = ICONO_POR_TIPO[r.tipo];
                return (
                  <button
                    key={`${r.tipo}-${r.id}`}
                    onClick={() => {
                      setSeleccionado(r);
                      setAbierto(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <Icono className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-700">{r.titulo}</span>
                      {r.subtitulo && <span className="block truncate text-xs text-slate-400">{r.subtitulo}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {seleccionado && IconoSeleccionado && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 p-4" onClick={() => setSeleccionado(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <IconoSeleccionado className="h-4 w-4 text-[#FD5249]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#0B1D4D]">{seleccionado.titulo}</p>
                  {seleccionado.subtitulo && <p className="truncate text-xs text-slate-400">{seleccionado.subtitulo}</p>}
                </div>
              </div>
              <button onClick={() => setSeleccionado(null)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 space-y-2 rounded-xl bg-slate-50 p-3">
              {seleccionado.detalle.length === 0 ? (
                <p className="text-xs text-slate-400">No hay más información disponible.</p>
              ) : (
                seleccionado.detalle.map((d, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="shrink-0 font-semibold text-slate-500">{d.label}</span>
                    <span className="truncate text-right text-slate-700">{d.value}</span>
                  </div>
                ))
              )}
            </div>

            {seleccionado.href && (
              <Link
                href={seleccionado.href}
                onClick={() => setSeleccionado(null)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
              >
                Ver ficha completa <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
