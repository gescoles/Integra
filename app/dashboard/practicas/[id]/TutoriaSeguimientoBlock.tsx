"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Pencil, X } from "lucide-react";
import { guardarTutoriaSeguimiento } from "../actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";
import { useLocale } from "../../SchoolContext";
import { translate } from "../../i18n";

type Tutoria = { id: string; tipo: string; fecha: string | null; resumen: string | null; medioContacto: string | null };

const TIPOS = ["INICIAL", "MEDIA", "FINAL"] as const;

function TutoriaSlot({
  tipo,
  tutoria,
  convenioId,
  fichaId,
  bloqueado,
  fechaMinima,
  fechaMaxima,
  convenioFechaInicio,
  convenioFechaFin,
}: {
  tipo: (typeof TIPOS)[number];
  tutoria?: Tutoria;
  convenioId: string;
  fichaId: string;
  bloqueado: boolean;
  fechaMinima?: string | null;
  fechaMaxima?: string | null;
  convenioFechaInicio?: string | null;
  convenioFechaFin?: string | null;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const labelKey =
    tipo === "INICIAL" ? "practicas.tutoriaInicial" : tipo === "MEDIA" ? "practicas.tutoriaMedia" : "practicas.tutoriaFinal";
  const labelAnteriorKey =
    tipo === "MEDIA" ? "practicas.tutoriaInicial" : tipo === "FINAL" ? "practicas.tutoriaMedia" : null;
  const labelSiguienteKey = tipo === "INICIAL" ? "practicas.tutoriaMedia" : tipo === "MEDIA" ? "practicas.tutoriaFinal" : null;

  async function handleSubmit(formData: FormData) {
    const fechaElegida = formData.get("fecha") as string;

    // Comprobación al momento, antes de mandarlo al servidor (el servidor
    // también lo revisa, esto es solo para avisar rápido sin esperar).
    if (fechaMinima && fechaElegida && fechaElegida <= fechaMinima) {
      setError(
        `${translate(locale, labelKey)}: ${translate(locale, "practicas.avisoFechaPosterior")} ${
          labelAnteriorKey ? translate(locale, labelAnteriorKey) : ""
        }.`
      );
      return;
    }
    if (fechaMaxima && fechaElegida && fechaElegida >= fechaMaxima) {
      setError(
        `${translate(locale, labelKey)}: ${translate(locale, "practicas.avisoFechaAnterior")} ${
          labelSiguienteKey ? translate(locale, labelSiguienteKey) : ""
        }.`
      );
      return;
    }

    formData.set("convenioId", convenioId);
    formData.set("practicaAlumnoId", fichaId);
    formData.set("tipo", tipo);
    setPending(true);
    setError(null);
    try {
      await guardarTutoriaSeguimiento(formData);
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  const fmtDate = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {tutoria ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-slate-300" />
          )}
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{translate(locale, labelKey)}</span>
        </div>
        {!bloqueado && (
          <button onClick={() => setOpen(true)} className="text-slate-400 hover:text-[#FD5249]">
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {tutoria ? (
        <div className="mt-1.5 text-xs text-slate-500">
          {tutoria.fecha && <div className="font-medium text-slate-600">{new Date(tutoria.fecha).toLocaleDateString("es-ES")}</div>}
          {tutoria.medioContacto && <div className="text-slate-400">{tutoria.medioContacto}</div>}
          {tutoria.resumen && <p className="mt-0.5 whitespace-pre-wrap break-words">{tutoria.resumen}</p>}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-slate-300">{translate(locale, "practicas.sinRegistrar")}</p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B1D4D]">{translate(locale, labelKey)}</h3>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form ref={formRef} action={handleSubmit} className="space-y-3">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {translate(locale, "tutorias.colFecha")} <span className="text-red-500">*</span>
                </label>
                <input
                  name="fecha"
                  type="date"
                  required
                  min={fechaMinima ? new Date(new Date(fechaMinima).getTime() + 86400000).toISOString().slice(0, 10) : convenioFechaInicio ? convenioFechaInicio.slice(0, 10) : undefined}
                  max={fechaMaxima ? new Date(new Date(fechaMaxima).getTime() - 86400000).toISOString().slice(0, 10) : convenioFechaFin ? convenioFechaFin.slice(0, 10) : undefined}
                  defaultValue={fmtDate(tutoria?.fecha)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {translate(locale, "practicas.medioContacto")} <span className="text-red-500">*</span>
                </label>
                <select
                  name="medioContacto"
                  required
                  defaultValue={tutoria?.medioContacto ?? ""}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                >
                  <option value="" disabled>
                    —
                  </option>
                  <option value="Llamada">{translate(locale, "practicas.llamada")}</option>
                  <option value="Correo">{translate(locale, "practicas.correo")}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {translate(locale, "practicas.resumenTutoria")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="resumen"
                  rows={3}
                  required
                  defaultValue={tutoria?.resumen ?? ""}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-3 py-2 text-xs font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {translate(locale, "common.guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function TutoriaSeguimientoBlock({
  convenioId,
  fichaId,
  tutorias,
  bloqueado,
  convenioFechaInicio,
  convenioFechaFin,
}: {
  convenioId: string;
  fichaId: string;
  tutorias: Tutoria[];
  bloqueado: boolean;
  convenioFechaInicio?: string | null;
  convenioFechaFin?: string | null;
}) {
  const { locale } = useLocale();
  const porTipo = new Map(tutorias.map((t) => [t.tipo, t]));
  const fechaInicial = porTipo.get("INICIAL")?.fecha ?? null;
  const fechaMedia = porTipo.get("MEDIA")?.fecha ?? null;
  const fechaFinal = porTipo.get("FINAL")?.fecha ?? null;

  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {translate(locale, "practicas.tutoriasSeguimiento")}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <TutoriaSlot
          tipo="INICIAL"
          tutoria={porTipo.get("INICIAL")}
          convenioId={convenioId}
          fichaId={fichaId}
          bloqueado={bloqueado}
          fechaMaxima={fechaMedia}
          convenioFechaInicio={convenioFechaInicio}
        />
        <TutoriaSlot
          tipo="MEDIA"
          tutoria={porTipo.get("MEDIA")}
          convenioId={convenioId}
          fichaId={fichaId}
          bloqueado={bloqueado}
          fechaMinima={fechaInicial}
          fechaMaxima={fechaFinal}
        />
        <TutoriaSlot
          tipo="FINAL"
          tutoria={porTipo.get("FINAL")}
          convenioId={convenioId}
          fichaId={fichaId}
          bloqueado={bloqueado}
          fechaMinima={fechaMedia}
          convenioFechaFin={convenioFechaFin}
        />
      </div>
    </div>
  );
}
