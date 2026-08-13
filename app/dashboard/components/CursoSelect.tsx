"use client";

import { useEffect, useState } from "react";
import { obtenerGruposDelCentro } from "../gruposActions";

export function CursoSelect({
  name = "curso",
  defaultValue = "",
  required = true,
  className,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  // Componente CONTROLADO a propósito: con un <select> no controlado
  // (defaultValue), en cuanto termina de cargar la lista de grupos y se
  // añaden las opciones reales, el navegador puede perder de vista cuál
  // era el valor seleccionado y la selección salta a la primera opción
  // sin que se note — pareciendo que el cambio de curso "no se guarda".
  // Con estado propio, el valor mostrado siempre es el que de verdad se
  // va a enviar en el formulario.
  const [valor, setValor] = useState(defaultValue || "");
  const [grupos, setGrupos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerGruposDelCentro()
      .then(setGrupos)
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <select
        name={name}
        required={required}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        disabled={cargando}
        className={
          className ??
          "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249] disabled:opacity-60"
        }
      >
        <option value="" disabled>
          {cargando ? "Cargando..." : "Selecciona..."}
        </option>
        {/* Si el valor actual ya no está en la lista del centro (se borró
            o se renombró), lo dejamos igualmente como opción para no
            perder el dato existente al editar. */}
        {valor && !grupos.includes(valor) && (
          <option value={valor}>{valor}</option>
        )}
        {grupos.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      {!cargando && grupos.length === 0 && (
        <p className="mt-1 text-[11px] text-amber-600">
          Tu centro todavía no tiene grupos configurados. Pídeselo a dirección/coordinación en "Grupos".
        </p>
      )}
    </div>
  );
}
