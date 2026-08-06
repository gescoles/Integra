"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Calendar, Users, Euro, MapPin } from "lucide-react";
import { aprobarSalida, rechazarSalida } from "../actions";
import { useLocale } from "../../SchoolContext";
import { translate } from "../../i18n";

type Row = {
  id: string;
  curso: string;
  tipo: string;
  actividad: string;
  fecha: string;
  horaSalida: string;
  horaVuelta: string | null;
  vueltaDirectaCasa: boolean;
  responsableName: string;
  numAlumnos: number;
  costo: number;
  moneda: string;
  observaciones: string | null;
  creadoPorNombre: string;
};

const monedaSimbolo: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

export function AprobacionesClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAprobar(id: string) {
    setProcessingId(id);
    setError(null);
    startTransition(async () => {
      try {
        await aprobarSalida(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo aprobar.");
      } finally {
        setProcessingId(null);
      }
    });
  }

  function handleRechazar(id: string) {
    if (!confirm(translate(locale, "salidas.confirmRechazar"))) return;
    setProcessingId(id);
    setError(null);
    startTransition(async () => {
      try {
        await rechazarSalida(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo rechazar.");
      } finally {
        setProcessingId(null);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
        {translate(locale, "salidas.sinPendientes")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0B1D4D]">{r.actividad}</h3>
              <p className="text-xs text-slate-400">
                {r.curso} · {r.tipo} · {translate(locale, "salidas.propuestaPor")} {r.creadoPorNombre}
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
              {translate(locale, "status.PENDIENTE")}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <div>{new Date(r.fecha).toLocaleDateString("es-ES")}</div>
                <div className="text-xs text-slate-400">{r.horaSalida} – {r.vueltaDirectaCasa ? translate(locale, "salidas.directoACasa") : r.horaVuelta}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <div>{r.numAlumnos} {translate(locale, "salidas.alumnos")}</div>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-slate-400" />
              <div>{r.costo.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {monedaSimbolo[r.moneda] ?? r.moneda}</div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <div>{r.responsableName}</div>
            </div>
          </div>

          {r.observaciones && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{r.observaciones}</p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => handleRechazar(r.id)}
              disabled={isPending && processingId === r.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" /> {translate(locale, "salidas.rechazar")}
            </button>
            <button
              onClick={() => handleAprobar(r.id)}
              disabled={isPending && processingId === r.id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" /> {translate(locale, "salidas.aprobar")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
