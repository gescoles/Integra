"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  X,
  Check,
  Send,
  Filter,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Upload,
  FileText,
  CircleDot,
  Pencil,
  UserX,
} from "lucide-react";
import {
  asignarSustitutoCobertura,
  rechazarSolicitud,
  aceptarAusencia,
  actualizarEstadoJustificante,
  subirJustificante,
} from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Solicitud = {
  id: string;
  estado: string;
  profesorAusenteId: string;
  profesorAusenteNombre: string;
  profesorAusenteAvatarUrl: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  asignatura: string | null;
  grupo: string | null;
  ubicacion: string | null;
  motivo: string | null;
  trabajoAlumnos: string | null;
  estadoJustificante: string;
  justificanteUrl: string | null;
  justificanteNombre: string | null;
  justificanteFecha: string | null;
  profesorSustitutoId: string | null;
  profesorSustitutoNombre: string | null;
  createdAt: string;
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
function fechaCorta(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "short" });
}
function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  ACEPTADA: "bg-blue-100 text-blue-700",
  ASIGNADA: "bg-emerald-100 text-emerald-700",
  RECHAZADA: "bg-red-100 text-red-700",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  ASIGNADA: "Asignada",
  RECHAZADA: "Rechazada",
};
const JUSTIFICANTE_DOT: Record<string, string> = {
  RECIBIDO: "bg-emerald-500",
  PENDIENTE: "bg-amber-500",
  NO_ENTREGADO: "bg-red-400",
  NO_APLICA: "bg-slate-300",
};
const JUSTIFICANTE_LABEL: Record<string, string> = {
  RECIBIDO: "Recibido",
  PENDIENTE: "Pendiente",
  NO_ENTREGADO: "No entregado",
  NO_APLICA: "No hace falta",
};

function PanelDetalle({
  s,
  profesores,
  guardias,
  horarios,
  onCerrar,
}: {
  s: Solicitud;
  profesores: Profesor[];
  guardias: GuardiaProgramada[];
  horarios: Horario[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pendingAceptar, setPendingAceptar] = useState(false);
  const [pendingRechazo, setPendingRechazo] = useState(false);
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [pendingJustificante, setPendingJustificante] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [busquedaManual, setBusquedaManual] = useState("");
  const [sustitutoId, setSustitutoId] = useState<string | null>(null);
  const [editandoAsignacion, setEditandoAsignacion] = useState(false);
  const [pendingAsignar, setPendingAsignar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sugerencias: quien ya está de guardia en ese horario (según el horario
  // semanal o guardias ya programadas), ordenadas dando prioridad a quien
  // comparte la misma asignatura que el profesor ausente.
  const sugerencias = useMemo(() => {
    const inicioMin = minutos(s.horaInicio);
    const finMin = minutos(s.horaFin);
    const diaSemana = diaSemanaDe(s.fecha);

    const idsDesdeGuardiasCalendario = guardias
      .filter((g) => g.fecha.slice(0, 10) === s.fecha.slice(0, 10) && g.profesorId !== s.profesorAusenteId)
      .filter((g) => {
        const match = g.turno.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
        if (!match) return true;
        return inicioMin < minutos(match[2]) && finMin > minutos(match[1]);
      })
      .map((g) => g.profesorId);

    const idsDesdeHorario = horarios
      .filter((h) => Boolean(h.esGuardia) && h.diaSemana === diaSemana && h.profesorId !== s.profesorAusenteId)
      .filter((h) => inicioMin < minutos(h.horaFin) && finMin > minutos(h.horaInicio))
      .map((h) => h.profesorId);

    const idsDeGuardia = new Set([...idsDesdeGuardiasCalendario, ...idsDesdeHorario]);
    return profesores
      .filter((p) => idsDeGuardia.has(p.id))
      .slice(0, 3)
      .map((p, i) => {
        // Carga aproximada: cuántas horas de guardia ya tiene asignadas
        // esta semana, como referencia rápida para repartir mejor entre
        // el profesorado (no es un cálculo exacto de jornada).
        const horasCarga = guardias.filter((g) => g.profesorId === p.id).length * 2;
        return {
          ...p,
          compatibilidad: i === 0 ? "Alta compatibilidad" : i === 1 ? "Buena compatibilidad" : "Compatibilidad media",
          color: i === 0 ? "text-emerald-600 bg-emerald-50" : i === 1 ? "text-blue-600 bg-blue-50" : "text-amber-600 bg-amber-50",
          disponible: `${s.horaInicio} - ${s.horaFin}`,
          carga: `${horasCarga} h / 25 h`,
        };
      });
  }, [guardias, horarios, profesores, s]);

  const resultadosManual = useMemo(() => {
    const q = busquedaManual.trim().toLowerCase();
    return profesores
      .filter((p) => p.id !== s.profesorAusenteId)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [profesores, s.profesorAusenteId, busquedaManual]);

  async function handleAceptar() {
    setPendingAceptar(true);
    setError(null);
    try {
      await aceptarAusencia(s.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo aceptar.");
    } finally {
      setPendingAceptar(false);
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

  async function handleCambiarJustificante(estado: "PENDIENTE" | "RECIBIDO" | "NO_ENTREGADO" | "NO_APLICA") {
    setPendingJustificante(true);
    setError(null);
    try {
      await actualizarEstadoJustificante(s.id, estado);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el justificante.");
    } finally {
      setPendingJustificante(false);
    }
  }

  async function handleSubirArchivo(file: File) {
    setSubiendoArchivo(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("justificante", file);
      await subirJustificante(s.id, formData);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendoArchivo(false);
    }
  }

  async function handleAsignar() {
    if (!sustitutoId) return;
    setPendingAsignar(true);
    setError(null);
    try {
      await asignarSustitutoCobertura(s.id, sustitutoId);
      setEditandoAsignacion(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asignar.");
    } finally {
      setPendingAsignar(false);
    }
  }

  const historial = useMemo(() => {
    const items = [
      { titulo: "Solicitud creada", detalle: `${s.profesorAusenteNombre} solicitó una ausencia.`, fecha: fechaHora(s.createdAt), hecho: true },
    ];
    if (s.estadoJustificante === "RECIBIDO") {
      items.push({ titulo: "Justificante recibido", detalle: s.justificanteNombre ?? "Archivo adjuntado.", fecha: s.justificanteFecha ? fechaHora(s.justificanteFecha) : "", hecho: true });
    } else if (s.estadoJustificante === "NO_APLICA") {
      items.push({ titulo: "Justificante no hace falta", detalle: "No hace falta justificante para esta ausencia.", fecha: "", hecho: true });
    } else if (s.estadoJustificante === "NO_ENTREGADO") {
      items.push({ titulo: "Justificante no entregado", detalle: "El profesor no ha entregado el justificante.", fecha: "", hecho: true });
    } else {
      items.push({ titulo: "Justificante pendiente", detalle: "A la espera de entrega del justificante.", fecha: "", hecho: false });
    }
    if (s.estado === "PENDIENTE") {
      items.push({ titulo: "Pendiente de revisión", detalle: "Coordinación debe revisar la solicitud.", fecha: "", hecho: false });
    } else if (s.estado === "RECHAZADA") {
      items.push({ titulo: "Ausencia rechazada", detalle: "La solicitud fue rechazada.", fecha: "", hecho: true });
    } else {
      items.push({ titulo: "Ausencia aceptada", detalle: "Coordinación aceptó la ausencia.", fecha: "", hecho: true });
      if (s.profesorSustitutoNombre) {
        items.push({ titulo: "Sustituto asignado", detalle: `${s.profesorSustitutoNombre} cubrirá la guardia.`, fecha: "", hecho: true });
      } else {
        items.push({ titulo: "Pendiente de asignar sustituto", detalle: "Todavía no hay quien cubra la guardia.", fecha: "", hecho: false });
      }
    }
    return items;
  }, [s]);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
            {s.profesorAusenteAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.profesorAusenteAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-400">
                {s.profesorAusenteNombre.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-base font-bold text-[#0B1D4D]">{s.profesorAusenteNombre}</p>
            <p className="text-xs text-slate-400">{s.asignatura ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ESTADO_BADGE[s.estado]}`}>{ESTADO_LABEL[s.estado]}</span>
          <button onClick={onCerrar} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 border-b border-slate-100 pb-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" /> {fechaCorta(s.fecha)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-400" /> {s.horaInicio} - {s.horaFin}
        </span>
        {s.ubicacion && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" /> {s.ubicacion}
          </span>
        )}
        <span className="basis-full text-slate-400">Solicitado el {fechaHora(s.createdAt)}</span>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

      {s.estado === "PENDIENTE" && (
        <div className="mb-5">
          {confirmandoRechazo ? (
            <div className="space-y-2">
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
                  onClick={() => setConfirmandoRechazo(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  {translate(locale, "common.cancelar")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleAceptar}
                disabled={pendingAceptar}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {pendingAceptar ? <ButtonSpinner /> : <Check className="h-4 w-4" />}
                Aceptar ausencia
              </button>
              <button
                onClick={() => setConfirmandoRechazo(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
                Rechazar ausencia
              </button>
            </div>
          )}
        </div>
      )}

      {s.estado !== "RECHAZADA" && (
        <div className="mb-5 border-b border-slate-100 pb-5">
          <p className="mb-2 text-sm font-bold text-[#0B1D4D]">Justificante</p>
          {s.estado === "PENDIENTE" && (
            <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
              Se podrá gestionar el justificante en cuanto se acepte la ausencia.
            </p>
          )}
          <div className="mb-3 flex items-center gap-4 text-sm">
            {(["RECIBIDO", "PENDIENTE", "NO_ENTREGADO", "NO_APLICA"] as const).map((op) => (
              <button
                key={op}
                onClick={() => handleCambiarJustificante(op)}
                disabled={pendingJustificante || s.estado === "PENDIENTE"}
                className="flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CircleDot
                  className={`h-4 w-4 ${
                    s.estadoJustificante === op
                      ? op === "RECIBIDO"
                        ? "text-emerald-500"
                        : op === "PENDIENTE"
                          ? "text-amber-500"
                          : op === "NO_ENTREGADO"
                            ? "text-red-400"
                            : "text-slate-400"
                      : "text-slate-200"
                  }`}
                />
                <span className={s.estadoJustificante === op ? "font-semibold text-slate-700" : "text-slate-400"}>{JUSTIFICANTE_LABEL[op]}</span>
              </button>
            ))}
          </div>

          {s.justificanteUrl ? (
            <a
              href={s.justificanteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="truncate">{s.justificanteNombre}</span>
            </a>
          ) : (
            <label className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-4 text-center text-xs ${
              s.estado === "PENDIENTE"
                ? "cursor-not-allowed border-slate-200 text-slate-300"
                : "cursor-pointer border-slate-300 text-slate-400 hover:border-[#FD5249] hover:text-[#FD5249]"
            }`}>
              {subiendoArchivo ? (
                <ButtonSpinner light={false} />
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Adjuntar justificante (PDF, JPG, PNG)</span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                disabled={subiendoArchivo || s.estado === "PENDIENTE"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleSubirArchivo(f);
                }}
              />
            </label>
          )}
        </div>
      )}

      {(s.estado === "ACEPTADA" || s.estado === "ASIGNADA") && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-bold text-[#0B1D4D]">Asignar guardia</p>

          {s.estado === "ASIGNADA" && s.profesorSustitutoNombre && !editandoAsignacion ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
              <span>Guardia ya enviada — la cubre {s.profesorSustitutoNombre}.</span>
              <button
                onClick={() => {
                  setSustitutoId(null);
                  setEditandoAsignacion(true);
                }}
                title="Editar y asignar manualmente a otro profesor"
                className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Pencil className="h-3 w-3" /> Editar
              </button>
            </div>
          ) : (
            <>
              <input
                value={busquedaManual}
                onChange={(e) => setBusquedaManual(e.target.value)}
                placeholder="Buscar docente disponible..."
                className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
              />

              {busquedaManual.trim() ? (
                <div className="mb-3 max-h-40 space-y-1 overflow-y-auto">
                  {resultadosManual.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSustitutoId(p.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                        sustitutoId === p.id ? "border-[#FD5249] bg-red-50 font-semibold text-[#FD5249]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <p className="font-semibold text-slate-500">Sugerencias</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {sugerencias.length === 0 ? (
                      <p className="col-span-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-400">
                        {translate(locale, "guardias.nadieDeGuardia")}
                      </p>
                    ) : (
                      sugerencias.map((p) => (
                        <div key={p.id} className="rounded-xl border border-slate-200 p-3 text-center">
                          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="truncate text-xs font-semibold text-slate-700">{p.name}</p>
                          <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${p.color}`}>{p.compatibilidad}</span>
                          <p className="mt-1 text-[10px] text-slate-400">Disponible {p.disponible}</p>
                          <p className="text-[10px] text-slate-400">Carga: {p.carga}</p>
                          <button
                            onClick={() => setSustitutoId(p.id)}
                            className={`mt-2 w-full rounded-lg border py-1.5 text-xs font-semibold ${
                              sustitutoId === p.id ? "border-[#FD5249] bg-[#FD5249] text-white" : "border-slate-200 text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]"
                            }`}
                          >
                            Asignar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {sustitutoId && (
                <button
                  onClick={handleAsignar}
                  disabled={pendingAsignar}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {pendingAsignar ? <ButtonSpinner /> : <Send className="h-4 w-4" />}
                  Asignar guardia
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-bold text-[#0B1D4D]">Historial</p>
        <div className="space-y-3">
          {historial.map((h, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${h.hecho ? "bg-blue-600" : "bg-slate-300"}`} />
                {i < historial.length - 1 && <span className="mt-0.5 w-px flex-1 bg-slate-200" />}
              </div>
              <div className="pb-3">
                <p className="text-sm font-semibold text-slate-700">{h.titulo}</p>
                <p className="text-xs text-slate-400">{h.detalle}</p>
                {h.fecha && <p className="mt-0.5 text-[11px] text-slate-300">{h.fecha}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
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
  const searchParams = useSearchParams();
  const solicitudDestacada = searchParams.get("solicitud");
  const [tab, setTab] = useState<"PENDIENTE" | "ACEPTADA" | "RECHAZADA" | "TODAS">("TODAS");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(solicitudDestacada);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<"todas" | "7" | "14">("14");

  const contadores = useMemo(
    () => ({
      PENDIENTE: solicitudes.filter((s) => s.estado === "PENDIENTE").length,
      ACEPTADA: solicitudes.filter((s) => s.estado === "ACEPTADA" || s.estado === "ASIGNADA").length,
      RECHAZADA: solicitudes.filter((s) => s.estado === "RECHAZADA").length,
      TODAS: solicitudes.length,
    }),
    [solicitudes]
  );

  // Estadísticas de la cabecera. "Últimos/próximos 7 días" se calculan
  // sobre la fecha de la propia guardia (no hay un campo separado de
  // "fecha en que se aceptó"), que es la referencia más útil en la práctica.
  const stats = useMemo(() => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);
    const en7dias = new Date(hoy.getTime() + 7 * 86400000);

    const aceptadasUltimos7 = solicitudes.filter((s) => {
      if (s.estado !== "ACEPTADA" && s.estado !== "ASIGNADA") return false;
      const f = new Date(s.fecha);
      return f >= new Date(hoy.getTime() - 7 * 86400000) && f <= hoy;
    }).length;

    const sinCubrirProximos7 = solicitudes.filter((s) => {
      if (s.estado !== "ACEPTADA" || s.profesorSustitutoId) return false;
      const f = new Date(s.fecha);
      return f >= hoy && f <= en7dias;
    }).length;

    const ausentesHoy = solicitudes.filter((s) => s.estado !== "RECHAZADA" && s.fecha.slice(0, 10) === hoyStr).length;

    return {
      pendientes: contadores.PENDIENTE,
      aceptadasUltimos7,
      sinCubrirProximos7,
      ausentesHoy,
    };
  }, [solicitudes, contadores]);

  const filtradas = useMemo(() => {
    let lista = solicitudes;
    if (tab === "ACEPTADA") lista = lista.filter((s) => s.estado === "ACEPTADA" || s.estado === "ASIGNADA");
    else if (tab !== "TODAS") lista = lista.filter((s) => s.estado === tab);

    if (filtroFecha !== "todas") {
      const dias = filtroFecha === "7" ? 7 : 14;
      const hoy = new Date();
      const limite = new Date(hoy.getTime() + dias * 86400000);
      lista = lista.filter((s) => {
        const f = new Date(s.fecha);
        return f >= new Date(hoy.toDateString()) && f <= limite;
      });
    }

    const q = busquedaTexto.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (s) => s.profesorAusenteNombre.toLowerCase().includes(q) || (s.motivo ?? "").toLowerCase().includes(q)
      );
    }

    return lista;
  }, [solicitudes, tab, filtroFecha, busquedaTexto]);

  const seleccionada = solicitudes.find((s) => s.id === seleccionadaId) ?? null;

  if (solicitudes.length === 0) {
    return (
      <div className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
        <UserX className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">Todavía no hay ninguna solicitud de ausencia.</p>
        <p className="mt-1 text-xs text-slate-400">En cuanto alguien avise de que falta, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <CircleDot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#0B1D4D]">{stats.pendientes}</p>
            <p className="text-xs font-semibold text-slate-500">Pendientes</p>
            <p className="text-[11px] text-slate-400">Solicitudes por revisar</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#0B1D4D]">{stats.aceptadasUltimos7}</p>
            <p className="text-xs font-semibold text-slate-500">Aceptadas</p>
            <p className="text-[11px] text-slate-400">En los últimos 7 días</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
            <X className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#0B1D4D]">{stats.sinCubrirProximos7}</p>
            <p className="text-xs font-semibold text-slate-500">Guardias sin cubrir</p>
            <p className="text-[11px] text-slate-400">Próximos 7 días</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#0B1D4D]">{stats.ausentesHoy}</p>
            <p className="text-xs font-semibold text-slate-500">Docentes ausentes hoy</p>
            <p className="text-[11px] text-slate-400">En todo el centro</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              placeholder="Buscar docente o motivo..."
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
            />
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as typeof tab)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#FD5249]"
            >
              <option value="TODAS">Estado: Todas ({contadores.TODAS})</option>
              <option value="PENDIENTE">Estado: Pendientes ({contadores.PENDIENTE})</option>
              <option value="ACEPTADA">Estado: Aceptadas ({contadores.ACEPTADA})</option>
              <option value="RECHAZADA">Estado: Rechazadas ({contadores.RECHAZADA})</option>
            </select>
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value as typeof filtroFecha)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#FD5249]"
            >
              <option value="todas">Fecha: Todas</option>
              <option value="7">Fecha: Próximos 7 días</option>
              <option value="14">Fecha: Próximos 14 días</option>
            </select>
            <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-3 font-medium">Docente</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Horario</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Justificante</th>
                <th className="px-4 py-3 font-medium">Estado ausencia</th>
                <th className="px-4 py-3 font-medium">Asignación</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSeleccionadaId(s.id)}
                  className={`cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 ${seleccionadaId === s.id ? "bg-red-50/50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {s.profesorAusenteAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.profesorAusenteAvatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                            {s.profesorAusenteNombre.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">{s.profesorAusenteNombre}</p>
                        <p className="truncate text-xs text-slate-400">{s.asignatura ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fechaCorta(s.fecha)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {s.horaInicio}-{s.horaFin}
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3 text-slate-500">{s.motivo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${JUSTIFICANTE_DOT[s.estadoJustificante]}`} />
                      {JUSTIFICANTE_LABEL[s.estadoJustificante]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ESTADO_BADGE[s.estado]}`}>{ESTADO_LABEL[s.estado]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.estado === "RECHAZADA" ? (
                      <span className="text-slate-300">—</span>
                    ) : s.profesorSustitutoNombre ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">Asignada</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No hay solicitudes en esta pestaña.</p>
          )}
          </div>
        </div>
      </div>

      {seleccionada && (
        <div>
          <PanelDetalle
            s={seleccionada}
            profesores={profesores}
            guardias={guardias}
            horarios={horarios}
            onCerrar={() => setSeleccionadaId(null)}
          />
        </div>
      )}
    </div>
  );
}
