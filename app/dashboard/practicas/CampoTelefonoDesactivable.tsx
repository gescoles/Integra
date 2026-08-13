"use client";

import { useState } from "react";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";
import { PhoneInput } from "../components/PhoneInput";

export function CampoTelefonoDesactivable({
  label,
  name,
  defaultValue = "",
  initialmenteDesactivado = false,
}: {
  label: string;
  name: string;
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
      <PhoneInput name={name} defaultValue={desactivado ? "" : defaultValue} disabled={desactivado} required={!desactivado} />
    </div>
  );
}
