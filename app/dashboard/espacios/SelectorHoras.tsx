"use client";

import { useMemo } from "react";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

const LIMITES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "18:30"];

function aMinutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function SelectorHoras({
  horaInicio,
  horaFin,
  reservasDelDia,
  onChange,
}: {
  horaInicio: string;
  horaFin: string;
  reservasDelDia: { horaInicio: string; horaFin: string }[];
  onChange: (inicio: string, fin: string) => void;
}) {
  const { locale } = useLocale();

  const franjas = useMemo(() => {
    return LIMITES.slice(0, -1).map((inicio, i) => {
      const fin = LIMITES[i + 1];
      const iniMin = aMinutos(inicio);
      const finMin = aMinutos(fin);
      const ocupada = reservasDelDia.some((r) => iniMin < aMinutos(r.horaFin) && finMin > aMinutos(r.horaInicio));
      const seleccionada = Boolean(horaInicio) && Boolean(horaFin) && iniMin >= aMinutos(horaInicio) && finMin <= aMinutos(horaFin);
      return { inicio, fin, ocupada, seleccionada };
    });
  }, [reservasDelDia, horaInicio, horaFin]);

  function handleClick(index: number) {
    const franja = franjas[index];
    if (franja.ocupada) return;

    const iniActualIdx = horaInicio ? LIMITES.indexOf(horaInicio) : -1;

    if (iniActualIdx === -1 || horaFin) {
      onChange(franja.inicio, franja.fin);
      return;
    }

    const desde = Math.min(iniActualIdx, index);
    const hasta = Math.max(iniActualIdx, index);

    for (let i = desde; i <= hasta; i++) {
      if (franjas[i].ocupada) {
        onChange(franja.inicio, franja.fin);
        return;
      }
    }

    onChange(LIMITES[desde], LIMITES[hasta + 1]);
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {franjas.map((f, i) => (
          <button
            key={f.inicio}
            type="button"
            disabled={f.ocupada}
            onClick={() => handleClick(i)}
            className={`rounded-lg border px-1.5 py-2 text-[11px] font-semibold transition-colors ${
              f.ocupada
                ? "pointer-events-none cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300 opacity-40 line-through"
                : f.seleccionada
                ? "border-[#FD5249] bg-[#FD5249] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]"
            }`}
          >
            {f.inicio}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {horaInicio && horaFin
          ? `${translate(locale, "espacios.horarioSeleccionado")}: ${horaInicio} – ${horaFin}`
          : translate(locale, "espacios.ayudaSelectorHoras")}
      </p>
    </div>
  );
}
