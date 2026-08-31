"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserX, Clock, ShieldCheck, Send, CalendarDays } from "lucide-react";
import { crearCobertura } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Profesor = { id: string; name: string };
type Horario = { id: string; profesorId: string; diaSemana: number; horaInicio: string; horaFin: string; asignatura: string; grupo: string | null; esGuardia?: boolean };
type GuardiaProgramada = { profesorId: string; fecha: string; turno: string; ubicacion: string | null };

function diaSemanaDe(fechaISO: string) {
  const d = new Date(`${fechaISO}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}
function minutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CoberturaWizard({
  schoolId,
  profesores,
  horarios,
  guardias,
}: {
  schoolId: string;
  profesores: Profesor[];
  horarios: Horario[];
  guardias: GuardiaProgramada[];
}) {
  const router = useRouter();
  const { locale } = useLocale();

  const [fecha, setFecha] = useState(hoyISO());
  const [ausenteId, setAusenteId] = useState<string | null>(null);
  const [bloqueId, setBloqueId] = useState<string | null>(null);
  const [sustitutoId, setSustitutoId] = useState<string | null>(null);
  const [trabajoAlumnos, setTrabajoAlumnos] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const diaSemana = useMemo(() => diaSemanaDe(fecha), [fecha]);

  const horarioAusente = useMemo(
    () => horarios.filter((h) => h.profesorId === ausenteId && h.diaSemana === diaSemana).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    [horarios, ausenteId, diaSemana]
  );

  const bloqueSeleccionado = horarioAusente.find((h) => h.id === bloqueId) ?? null;

  const profesoresDeGuardia = useMemo(() => {
    if (!bloqueSeleccionado) return [];
    const inicioMin = minutos(bloqueSeleccionado.horaInicio);
    const finMin = minutos(bloqueSeleccionado.horaFin);

    // Profesores con una guardia puntual programada para esa fecha (el
    // sistema de guardias por calendario que ya existía).
    const idsDesdeGuardiasCalendario = guardias
      .filter((g) => g.fecha.slice(0, 10) === fecha && g.profesorId !== ausenteId)
      .filter((g) => {
        const match = g.turno.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
        if (!match) return true;
        const gInicio = minutos(match[1]);
        const gFin = minutos(match[2]);
        return inicioMin < gFin && finMin > gInicio;
      })
      .map((g) => g.profesorId);

    // Profesores que tienen esa franja marcada como "Guardia" en su
    // horario semanal habitual, ese mismo día de la semana.
    const idsDesdeHorario = horarios
      .filter((h) => h.esGuardia && h.diaSemana === diaSemana && h.profesorId !== ausenteId)
      .filter((h) => inicioMin < minutos(h.horaFin) && finMin > minutos(h.horaInicio))
      .map((h) => h.profesorId);

    const idsQueEstanDeGuardia = new Set([...idsDesdeGuardiasCalendario, ...idsDesdeHorario]);
    return profesores.filter((p) => idsQueEstanDeGuardia.has(p.id));
  }, [bloqueSeleccionado, guardias, horarios, diaSemana, fecha, ausenteId, profesores]);

  function reiniciar() {
    setAusenteId(null);
    setBloqueId(null);
    setSustitutoId(null);
    setEnviado(false);
    setError(null);
    setTrabajoAlumnos("");
  }

  async function handleEnviar() {
    if (!ausenteId || !bloqueSeleccionado || !sustitutoId) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("schoolId", schoolId);
    formData.set("profesorAusenteId", ausenteId);
    formData.set("profesorSustitutoId", sustitutoId);
    formData.set("fecha", fecha);
    formData.set("horaInicio", bloqueSeleccionado.horaInicio);
    formData.set("horaFin", bloqueSeleccionado.horaFin);
    formData.set("asignatura", bloqueSeleccionado.asignatura);
    formData.set("grupo", bloqueSeleccionado.grupo ?? "");
    formData.set("trabajoAlumnos", trabajoAlumnos.trim());
    try {
      await crearCobertura(formData);
      setEnviado(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setPending(false);
    }
  }

  const ausenteNombre = profesores.find((p) => p.id === ausenteId)?.name;
  const sustitutoNombre = profesores.find((p) => p.id === sustitutoId)?.name;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#0B1D4D]">{translate(locale, "guardias.buscarCobertura")}</h2>
          <p className="text-xs text-slate-400">{translate(locale, "guardias.buscarCoberturaAyuda")}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              reiniciar();
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#FD5249]"
          />
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

      {enviado ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
          <p className="text-sm font-bold text-emerald-700">{translate(locale, "guardias.coberturaEnviada")}</p>
          <p className="mt-1 text-sm text-slate-600">
            {sustitutoNombre} {translate(locale, "guardias.cubriraA")} {ausenteNombre}
          </p>
          <button
            onClick={reiniciar}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            {translate(locale, "guardias.buscarOtra")}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              <UserX className="h-3.5 w-3.5" /> 1. {translate(locale, "guardias.profesorAusente")}
            </label>
            <select
              value={ausenteId ?? ""}
              onChange={(e) => {
                setAusenteId(e.target.value || null);
                setBloqueId(null);
                setSustitutoId(null);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249] sm:max-w-sm"
            >
              <option value="">{translate(locale, "guardias.elegirProfesor")}</option>
              {profesores.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {ausenteId && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                <Clock className="h-3.5 w-3.5" /> 2. {translate(locale, "guardias.franjaQueFalta")}
              </label>
              {horarioAusente.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">{translate(locale, "guardias.sinHorarioEseDia")}</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {horarioAusente.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setBloqueId(h.id);
                        setSustitutoId(null);
                      }}
                      className={`rounded-lg border p-3 text-left text-xs transition-colors ${
                        bloqueId === h.id ? "border-[#FD5249] bg-red-50" : "border-slate-200 hover:border-[#FD5249]"
                      }`}
                    >
                      <div className="font-bold text-slate-700">{h.horaInicio} – {h.horaFin}</div>
                      <div className="text-slate-500">{h.asignatura}{h.grupo ? ` · ${h.grupo}` : ""}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {bloqueSeleccionado && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" /> 3. {translate(locale, "guardias.quienEstaDeGuardia")}
              </label>
              {profesoresDeGuardia.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-3 text-xs text-amber-600">{translate(locale, "guardias.nadieDeGuardia")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profesoresDeGuardia.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSustitutoId(p.id)}
                      className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${
                        sustitutoId === p.id ? "border-[#FD5249] bg-[#FD5249] text-white" : "border-slate-200 text-slate-600 hover:border-[#FD5249]"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {sustitutoId && (
            <div className="mb-3">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Qué tienen que hacer los alumnos <span className="text-xs font-normal text-slate-400">(opcional)</span>
              </label>
              <textarea
                value={trabajoAlumnos}
                onChange={(e) => setTrabajoAlumnos(e.target.value)}
                rows={2}
                placeholder="Si el profesor ausente ha dejado alguna instrucción para la clase..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              />
            </div>
          )}

          {sustitutoId && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">{sustitutoNombre}</span> {translate(locale, "guardias.cubriraA")}{" "}
                <span className="font-bold text-slate-700">{ausenteNombre}</span> · {bloqueSeleccionado?.horaInicio}–{bloqueSeleccionado?.horaFin}
              </div>
              <button
                onClick={handleEnviar}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
              >
                {pending ? <ButtonSpinner /> : <Send className="h-4 w-4" />}
                {translate(locale, "guardias.enviarAviso")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
