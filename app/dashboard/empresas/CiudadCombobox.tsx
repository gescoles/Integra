"use client";

import { useMemo, useState } from "react";
import { CIUDADES_CATALUNYA } from "@/lib/catalunyaCiudades";

export function CiudadCombobox({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [valor, setValor] = useState(defaultValue ?? "");
  const [abierto, setAbierto] = useState(false);

  const sugerencias = useMemo(() => {
    const q = valor.trim().toLowerCase();
    const lista = q ? CIUDADES_CATALUNYA.filter((c) => c.toLowerCase().includes(q)) : CIUDADES_CATALUNYA;
    return lista.slice(0, 30);
  }, [valor]);

  return (
    <div className="relative">
      <input
        name={name}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Elige o escribe una ciudad..."
        autoComplete="off"
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
      />
      {abierto && sugerencias.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {sugerencias.map((c) => (
            <button
              type="button"
              key={c}
              onMouseDown={() => {
                setValor(c);
                setAbierto(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
