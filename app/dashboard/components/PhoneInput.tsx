"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Lista de países más habituales para un centro educativo español
// (España primero y por defecto, resto de Europa y Latinoamérica). El
// código de 2 letras es el que usa flagcdn.com para servir la imagen de
// la bandera — nada de emoji, que en Windows no se pintan como banderas.
const PAISES = [
  { iso: "es", code: "+34", nombre: "España" },
  { iso: "fr", code: "+33", nombre: "Francia" },
  { iso: "pt", code: "+351", nombre: "Portugal" },
  { iso: "it", code: "+39", nombre: "Italia" },
  { iso: "de", code: "+49", nombre: "Alemania" },
  { iso: "gb", code: "+44", nombre: "Reino Unido" },
  { iso: "ad", code: "+376", nombre: "Andorra" },
  { iso: "ma", code: "+212", nombre: "Marruecos" },
  { iso: "dz", code: "+213", nombre: "Argelia" },
  { iso: "us", code: "+1", nombre: "EEUU / Canadá" },
  { iso: "mx", code: "+52", nombre: "México" },
  { iso: "ar", code: "+54", nombre: "Argentina" },
  { iso: "br", code: "+55", nombre: "Brasil" },
  { iso: "cl", code: "+56", nombre: "Chile" },
  { iso: "co", code: "+57", nombre: "Colombia" },
  { iso: "ve", code: "+58", nombre: "Venezuela" },
  { iso: "pe", code: "+51", nombre: "Perú" },
  { iso: "ec", code: "+593", nombre: "Ecuador" },
  { iso: "bo", code: "+591", nombre: "Bolivia" },
  { iso: "uy", code: "+598", nombre: "Uruguay" },
  { iso: "py", code: "+595", nombre: "Paraguay" },
  { iso: "cu", code: "+53", nombre: "Cuba" },
  { iso: "do", code: "+1", nombre: "Rep. Dominicana" },
  { iso: "cn", code: "+86", nombre: "China" },
  { iso: "ng", code: "+234", nombre: "Nigeria" },
  { iso: "sn", code: "+221", nombre: "Senegal" },
  { iso: "ci", code: "+225", nombre: "Costa de Marfil" },
] as const;

function Bandera({ iso, size = 20 }: { iso: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${iso}.png`}
      srcSet={`https://flagcdn.com/${size * 2}x${Math.round(size * 1.5)}/${iso}.png 2x`}
      alt=""
      width={size}
      height={Math.round(size * 0.75)}
      className="shrink-0 rounded-[2px] object-cover"
    />
  );
}

export function PhoneInput({
  name,
  defaultValue,
  required,
  disabled,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const partesIniciales = defaultValue?.match(/^(\+\d{1,4}) (.*)$/);
  const paisInicial = PAISES.find((p) => p.code === partesIniciales?.[1]) ?? PAISES[0];
  const [pais, setPais] = useState(paisInicial);
  const [numero, setNumero] = useState(partesIniciales?.[2] ?? "");
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Si el campo se desactiva ("No aplica") después de haber escrito algo,
  // hay que vaciar el número: si no, se quedaría guardado por dentro y se
  // enviaría igualmente al guardar, aunque el campo esté oculto/gris.
  useEffect(() => {
    if (disabled) setNumero("");
  }, [disabled]);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  return (
    <div className="flex gap-1.5">
      <div ref={ref} className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAbierto((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-[#FD5249] disabled:bg-slate-50 disabled:opacity-60"
        >
          <Bandera iso={pais.iso} />
          <span className="text-slate-600">{pais.code}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>

        {abierto && (
          <div className="absolute z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {PAISES.map((p) => (
              <button
                key={`${p.iso}-${p.code}`}
                type="button"
                onClick={() => {
                  setPais(p);
                  setAbierto(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <Bandera iso={p.iso} />
                <span className="flex-1 truncate text-slate-700">{p.nombre}</span>
                <span className="text-slate-400">{p.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        value={numero}
        onChange={(e) => setNumero(e.target.value.replace(/[^0-9]/g, ""))}
        required={required}
        disabled={disabled}
        inputMode="numeric"
        placeholder="612 345 678"
        pattern="[0-9]{6,12}"
        title="Solo números, entre 6 y 12 dígitos"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249] disabled:bg-slate-50 disabled:text-slate-300"
      />
      {/* Valor combinado real que se envía en el formulario, ej. "+34 612345678".
          Si el campo está desactivado ("No aplica"), no lleva "name" — así
          no se envía nada de este campo al guardar, ni por accidente. */}
      <input type="hidden" name={disabled ? undefined : name} value={numero ? `${pais.code} ${numero}` : ""} />
    </div>
  );
}
