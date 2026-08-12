"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserX, Send, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { crearSolicitudCobertura } from "./actions";
import { WeeklyDragGrid, type BloqueVisual } from "../components/WeeklyDragGrid";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type BloqueHorario = {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  asignatura: string;
  grupo: string | null;
  aula: string | null;
  esGuardia: boolean;
};

const DIAS_KEYS = [1, 2, 3, 4, 5, 6, 7];
const HORA_INICIO_GRID = 8;
const HORA_FIN_GRID = 20;

function inicioDeSemana(base: Date) {
  const d = new Date(base);
  const dia = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (dia - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function formatoFecha(d: Date) {
  return d.toISOString().slice(0, 10);
}
function hoyUTC() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
function aMinutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function AvisarAusenciaForm({ miHorario }: { miHorario: BloqueHorario[] }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [inicioSemana, setInicioSemana] = useState(() => inicioDeSemana(hoyUTC()));
  const [seleccion, setSeleccion] = useState<{ fecha: string; horaInicio: string; horaFin: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const diasSemana = useMemo(() => {
    return DIAS_KEYS.map((offset) => {
      const d = new Date(inicioSemana);
      d.setUTCDate(d.getUTCDate() + (offset - 1));
      return d;
    });
  }, [inicioSemana]);

  const columnas = diasSemana.map((d, i) => {
    const fechaCol = formatoFecha(d);
    const esHoy = fechaCol === formatoFecha(hoyUTC());
    const esPasado = fechaCol < formatoFecha(hoyUTC());
    const bloquesDia = miHorario.filter((b) => b.diaSemana === DIAS_KEYS[i] && !b.esGuardia);
    const sinClase = bloquesDia.length === 0;

    // Minutos transcurridos hoy, para bloquear también las horas de hoy
    // que ya han pasado (aunque el día en sí no esté "bloqueado").
    const ahora = new Date();
    const minutosAhora = esHoy ? ahora.getHours() * 60 + ahora.getMinutes() : -1;

    // Un slot de 1h está habilitado SOLO si cae dentro de alguna clase
    // programada ese día, y si es hoy, además solo si todavía no ha
    // pasado esa hora.
    const numSlots = HORA_FIN_GRID - HORA_INICIO_GRID;
    const slotsHabilitados = Array.from({ length: numSlots }, (_, slot) => {
      const slotIniMin = (HORA_INICIO_GRID + slot) * 60;
      const slotFinMin = slotIniMin + 60;
      const dentroDeClase = bloquesDia.some((b) => slotIniMin < aMinutos(b.horaFin) && slotFinMin > aMinutos(b.horaInicio));
      if (!dentroDeClase) return false;
      if (esHoy && slotFinMin <= minutosAhora) return false;
      return true;
    });

    return {
      key: i,
      label: `${translate(locale, `dia.${DIAS_KEYS[i]}` as never)} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
      destacada: esHoy,
      bloqueada: esPasado || sinClase,
      motivoBloqueo: esPasado
        ? translate(locale, "guardias.diaYaPasado")
        : sinClase
        ? translate(locale, "guardias.sinClaseEseDia")
        : undefined,
      slotsHabilitados,
    };
  });

  const bloquesVisuales: BloqueVisual[] = diasSemana.flatMap((d, colIdx) =>
    miHorario
      .filter((b) => b.diaSemana === DIAS_KEYS[colIdx] && !b.esGuardia)
      .map((b) => ({
        id: `${b.id}-${colIdx}`,
        columna: colIdx,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
        titulo: b.asignatura,
        subtitulo: [b.grupo, b.aula].filter(Boolean).join(" · "),
        color: "#2F6FED",
      }))
  );

  function handleSeleccion(columna: number, horaInicioSel: string, horaFinSel: string) {
    const fechaSel = formatoFecha(diasSemana[columna]);
    setSeleccion({ fecha: fechaSel, horaInicio: horaInicioSel, horaFin: horaFinSel });
    setError(null);
  }

  async function handleSubmit(formData: FormData) {
    if (!seleccion) return;
    setPending(true);
    setError(null);
    formData.set("fecha", seleccion.fecha);
    formData.set("horaInicio", seleccion.horaInicio);
    formData.set("horaFin", seleccion.horaFin);
    try {
      await crearSolicitudCobertura(formData);
      setEnviado(true);
      setSeleccion(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el aviso.");
    } finally {
      setPending(false);
    }
  }

  if (enviado) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
        <p className="text-sm font-bold text-emerald-700">{translate(locale, "guardias.avisoEnviado")}</p>
        <p className="mt-1 text-sm text-slate-600">{translate(locale, "guardias.avisoEnviadoTexto")}</p>
        <button
          onClick={() => setEnviado(false)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
        >
          {translate(locale, "guardias.avisarOtraVez")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-bold text-[#0B1D4D]">
            <UserX className="h-4 w-4 text-[#FD5249]" /> {translate(locale, "guardias.avisarAusencia")}
          </h2>
          <p className="text-xs text-slate-400">{translate(locale, "guardias.avisarAusenciaAyuda")}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setInicioSemana((s) => { const d = new Date(s); d.setUTCDate(d.getUTCDate() - 7); return d; })}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-[#FD5249] hover:text-[#FD5249]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setInicioSemana((s) => { const d = new Date(s); d.setUTCDate(d.getUTCDate() + 7); return d; })}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-[#FD5249] hover:text-[#FD5249]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mb-2 text-xs text-slate-400">{translate(locale, "guardias.arrastraParaElegir")}</p>
      <WeeklyDragGrid
        columnas={columnas}
        horaInicio={HORA_INICIO_GRID}
        horaFin={HORA_FIN_GRID}
        bloques={bloquesVisuales}
        onSeleccion={handleSeleccion}
      />

      {/* Ventana emergente con el formulario: aparece encima de todo en
          cuanto se elige una franja, no empotrada en la página. */}
      {seleccion && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0B1D4D]">{translate(locale, "guardias.avisarAusencia")}</h3>
              <button onClick={() => setSeleccion(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

            <form action={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                {translate(locale, "guardias.franjaElegida")}:{" "}
                <strong className="text-slate-700">
                  {new Date(`${seleccion.fecha}T00:00:00Z`).toLocaleDateString("es-ES", { day: "2-digit", month: "long" })} · {seleccion.horaInicio}–{seleccion.horaFin}
                </strong>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "guardias.motivo")}</label>
                <input
                  name="motivo"
                  required
                  placeholder={translate(locale, "guardias.motivoPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "guardias.trabajoAlumnos")}</label>
                <textarea
                  name="trabajoAlumnos"
                  required
                  rows={4}
                  placeholder={translate(locale, "guardias.trabajoAlumnosPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FD5249] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
              >
                {pending ? <ButtonSpinner /> : <Send className="h-4 w-4" />}
                {translate(locale, "guardias.enviarAviso")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
