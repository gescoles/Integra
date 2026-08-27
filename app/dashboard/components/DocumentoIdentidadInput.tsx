"use client";

import { useState } from "react";

const PLACEHOLDERS: Record<string, string> = {
  DNI: "12345678Z",
  NIE: "X1234567L",
  PASAPORTE: "Ej. PAA123456",
};

export function DocumentoIdentidadInput({
  nombreTipo = "tipoDocumento",
  nombreNumero = "numeroDocumento",
  defaultTipo = "DNI",
  defaultNumero = "",
}: {
  nombreTipo?: string;
  nombreNumero?: string;
  defaultTipo?: string;
  defaultNumero?: string;
}) {
  const [tipo, setTipo] = useState(defaultTipo || "DNI");

  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <select
        name={nombreTipo}
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-2.5 text-sm outline-none focus:border-[#FD5249]"
      >
        <option value="DNI">DNI</option>
        <option value="NIE">NIE</option>
        <option value="PASAPORTE">Pasaporte</option>
      </select>
      <input
        name={nombreNumero}
        required
        defaultValue={defaultNumero}
        placeholder={PLACEHOLDERS[tipo]}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-[#FD5249]"
      />
    </div>
  );
}
