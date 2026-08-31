"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, GraduationCap, User, Building2, Layers, Loader2 } from "lucide-react";
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
                  <Link
                    key={`${r.tipo}-${r.id}`}
                    href={r.href}
                    onClick={() => setAbierto(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                  >
                    <Icono className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-700">{r.titulo}</span>
                      {r.subtitulo && <span className="block truncate text-xs text-slate-400">{r.subtitulo}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
