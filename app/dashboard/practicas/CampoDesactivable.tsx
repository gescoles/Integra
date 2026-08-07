"use client";

import { useState } from "react";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

export function CampoDesactivable({
  label,
  name,
  type = "text",
  defaultValue = "",
  initialmenteDesactivado = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  initialmenteDesactivado?: boolean;
}) {
  const { locale } = useLocale();
  const [desactivado, setDesactivado] = useState(initialmenteDesactivado);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
          <input
            type="checkbox"
            checked={desactivado}
            onChange={(e) => setDesactivado(e.target.checked)}
            className="rounded border-slate-300 accent-slate-400"
          />
          {translate(locale, "practicas.noAplica")}
        </label>
      </div>
      <input
        name={name}
        type={type}
        disabled={desactivado}
        defaultValue={desactivado ? "" : defaultValue}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249] disabled:bg-slate-50 disabled:text-slate-300"
      />
    </div>
  );
}
