"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserX, ShieldCheck, Send, ChevronDown, ChevronUp, X } from "lucide-react";
import { asignarSustitutoCobertura, rechazarSolicitud } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Solicitud = {
  id: string;
  profesorAusenteId: string;
  profesorAusenteNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  asignatura: string | null;
  grupo: string | null;
  ubicacion: string | null;
  motivo: string | null;
  trabajoAlumnos: string | null;
};
type Profesor = { id: string; name: string };
type GuardiaProgramada = { profesorId: string; fecha: string; turno: string; ubicacion: string | null };
type Horario = { profesorId: string; diaSemana: number; horaInicio: string; horaFin: string; esGuardia?: boolean };

function minutos(hhmm: string) {
  const [h, m] = hhmm.trim().split(":").map(Number);
  return h * 60 + m;
}
function diaSemanaDe(fechaISO: string) {
  const d = new Date(`${fechaISO.slice(0, 10)}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

function SolicitudCard({
  s,
  profesores,
  guardias,
  horarios,
  autoAbrir,
}: {
  s: Solicitud;
  profesores: Profesor[];
  guardias: GuardiaProgramada[];
  horarios: Horario[];
  autoAbrir?: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [abierta, setAbierta] = useState(Boolean(autoAbrir));
  const [sustitutoId, setSustitutoId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingRechazo, setPendingRechazo] = useState(false);
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoAbrir && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Solo al montar: es la llegada desde la notificación, no queremos
    // volver a hacer scroll cada vez que algo se re-renderiza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [error, setError] = useState<string | null>(null);

  const disponibles = useMemo(() => {
    const inicioMin = minutos(s.horaInicio);
    const finMin = minutos(s.horaFin);
    const diaSemana = diaSemanaDe(s.fecha);

    const idsDesdeGuardiasCalendario = guardias
      .filter((g) => g.fecha.slice(0, 10) === s.fecha.slice(0, 10) && g.profesorId !== s.profesorAusenteId)
      .filter((g) => {
        const match = g.turno.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
        if (!match) return true;
        const gInicio = minutos(match[1]);
        const gFin = minutos(match[2]);
        return inicioMin < gFin && finMin > gInicio;
      })
      .map((g) => g.profesorId);

    const idsDesdeHorario = horarios
      .filter((h) => Boolean(h.esGuardia) && h.diaSemana === diaSemana && h.profesorId !== s.profesorAusenteId)
      .filter((h) => inicioMin < minutos(h.horaFin) && finMin > minutos(h.horaInicio))
      .map((h) => h.profesorId);

    const idsDeGuardia = new Set([...idsDesdeGuardiasCalendario, ...idsDesdeHorario]);
    return profesores.filter((p) => idsDeGuardia.has(p.id));
  }, [guardias, horarios, profesores, s]);

  async function handleAsignar() {
    if (!sustitutoId) return;
    setPending(true);
    setError(null);
    try {
      await asignarSustitutoCobertura(s.id, sustitutoId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asignar.");
    } finally {
      setPending(false);
    }
  }

  async function handleRechazar() {
    if (!motivoRechazo.trim()) {
      setError(translate(locale, "guardias.indicaMotivoRechazo"));
      return;
    }
    setPendingRechazo(true);
    setError(null);
    try {
      await rechazarSolicitud(s.id, motivoRechazo.trim());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo rechazar.");
    } finally {
      setPendingRechazo(false);
      setConfirmandoRechazo(false);
    }
  }

  return (
    <div
      ref={cardRef}
      className={`rounded-xl border bg-amber-50/50 p-4 ${autoAbrir ? "border-[#FD5249] ring-2 ring-[#FD5249]/30" : "border-amber-200"}`}
    >
      <button onClick={() => setAbierta((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <UserX className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0B1D4D]">{s.profesorAusenteNombre}</p>
            <p className="text-xs text-slate-500">
              {new Date(`${s.fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "long" })} · {s.horaInicio}–{s.horaFin}
              {s.grupo ? ` · ${s.grupo}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-semibold text-[#FD5249] sm:inline">{translate(locale, "guardias.gestionarGuardia")}</span>
          {abierta ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {abierta && (
        <div className="mt-4 space-y-4 border-t border-amber-200 pt-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {s.asignatura && <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">{s.asignatura}</span>}
            {s.grupo && <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">{s.grupo}</span>}
            {s.ubicacion && <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">📍 {s.ubicacion}</span>}
          </div>

          {s.motivo && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{translate(locale, "guardias.motivo")}</p>
              <p className="rounded-lg bg-white px-3 py-2.5 text-sm text-slate-600">{s.motivo}</p>
            </div>
          )}

          {s.trabajoAlumnos && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{translate(locale, "guardias.trabajoAlumnos")}</p>
              <p className="rounded-lg bg-white px-3 py-2.5 text-sm text-slate-600">{s.trabajoAlumnos}</p>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> {translate(locale, "guardias.quienEstaDeGuardia")}
            </p>
            {disponibles.length === 0 ? (
              <p className="rounded-lg bg-white px-3 py-2.5 text-xs text-amber-600">{translate(locale, "guardias.nadieDeGuardia")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {disponibles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSustitutoId(p.id)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${
                      sustitutoId === p.id ? "border-[#FD5249] bg-[#FD5249] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#FD5249]"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {sustitutoId && (
              <button
                onClick={handleAsignar}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
              >
                {pending ? <ButtonSpinner /> : <Send className="h-4 w-4" />}
                {translate(locale, "guardias.enviarAviso")}
              </button>
            )}

            {confirmandoRechazo ? (
              <div className="w-full space-y-2">
                <label className="block text-xs font-semibold text-slate-600">{translate(locale, "guardias.motivoRechazoLabel")}</label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={2}
                  placeholder={translate(locale, "guardias.motivoRechazoPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRechazar}
                    disabled={pendingRechazo}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {pendingRechazo ? <ButtonSpinner /> : translate(locale, "guardias.siRechazar")}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmandoRechazo(false);
                      setMotivoRechazo("");
                      setError(null);
                    }}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    {translate(locale, "common.cancelar")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoRechazo(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
                {translate(locale, "guardias.rechazarSolicitud")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SolicitudesPendientes({
  solicitudes,
  profesores,
  guardias,
  horarios,
}: {
  solicitudes: Solicitud[];
  profesores: Profesor[];
  guardias: GuardiaProgramada[];
  horarios: Horario[];
}) {
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const solicitudDestacada = searchParams.get("solicitud");
  if (solicitudes.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0B1D4D]">
        {translate(locale, "guardias.solicitudesPendientes")}
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{solicitudes.length}</span>
      </h2>
      <div className="space-y-2">
        {solicitudes.map((s) => (
          <SolicitudCard
            key={s.id}
            s={s}
            profesores={profesores}
            guardias={guardias}
            horarios={horarios}
            autoAbrir={s.id === solicitudDestacada}
          />
        ))}
      </div>
    </div>
  );
}
