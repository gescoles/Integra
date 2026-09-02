"use client";

import { useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Phone,
  Mail,
  Pencil,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ClipboardCheck,
  Eye,
} from "lucide-react";
import { NuevoAlumnoModal } from "./NuevoAlumnoModal";
import { CursoSelect } from "../components/CursoSelect";
import { DocumentoIdentidadInput } from "../components/DocumentoIdentidadInput";
import { PhoneInput } from "../components/PhoneInput";
import {
  createTutoriaAlumno,
  updateAlumnoFicha,
  updateTutoriaAlumno,
  cerrarTutoria,
  deleteTutoriaAlumno,
} from "./alumnoActions";
import { EliminarAlumnoModal } from "./EliminarAlumnoModal";
import {
  RIESGO_LABELS,
  RIESGO_COLORS,
  CON_QUIEN_LABELS,
  MEDIO_LABELS,
} from "./alumnoConstants";
import { TUTORIA_STATUS_COLORS } from "../constants";
import { useLocale, useGuardadoTransition } from "../SchoolContext";
import { translate } from "../i18n";

type Contacto = { id: string; relacion: string; telefono: string | null; email: string | null };
type TutoriaItem = {
  id: string;
  sessionDate: string;
  conQuien: string | null;
  medio: string | null;
  causa: string;
  notas: string | null;
  status: string;
  proximoSeguimiento: string | null;
};
type Alumno = {
  id: string;
  nombre: string;
  curso: string;
  edad: number | null;
  riesgo: string;
  avatarUrl: string | null;
  fechaNacimiento: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  direccion: string | null;
  contactos: Contacto[];
  tutorias: TutoriaItem[];
};

const STATUS_ICON: Record<string, ReactElement> = {
  PENDIENTE: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  COMPLETADA: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
};

function alumnoInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AlumnosClient({
  alumnos,
  selected,
  tutorName,
}: {
  alumnos: Alumno[];
  selected: Alumno | null;
  tutorName: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [nuevaTutoriaOpen, setNuevaTutoriaOpen] = useState(false);
  const [editFichaOpen, setEditFichaOpen] = useState(false);
  const [editingTutoria, setEditingTutoria] = useState<TutoriaItem | null>(null);
  const [viewingTutoria, setViewingTutoria] = useState<TutoriaItem | null>(null);
  const [cerrandoTutoria, setCerrandoTutoria] = useState<TutoriaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cerrarError, setCerrarError] = useState<string | null>(null);
  const [justLength, setJustLength] = useState(0);
  const [pending, startTransition] = useGuardadoTransition();
  const [cerrando, startCerrarTransition] = useGuardadoTransition();

  async function handleEditTutoria(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateTutoriaAlumno(formData);
        setEditingTutoria(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la tutoría.");
      }
    });
  }

  function handleDeleteTutoria(id: string) {
    if (!confirm("¿Eliminar esta tutoría? No se puede deshacer.")) return;
    startTransition(async () => {
      try {
        await deleteTutoriaAlumno(id);
        setEditingTutoria(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  async function handleCerrarTutoria(formData: FormData) {
    setCerrarError(null);
    startCerrarTransition(async () => {
      try {
        await cerrarTutoria(formData);
        setCerrandoTutoria(null);
        setJustLength(0);
      } catch (e) {
        setCerrarError(e instanceof Error ? e.message : "No se pudo cerrar la tutoría.");
      }
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return alumnos;
    return alumnos.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [alumnos, search]);

  async function handleCreateTutoria(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createTutoriaAlumno(formData);
        setNuevaTutoriaOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo registrar la tutoría.");
      }
    });
  }

  async function handleEditFicha(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateAlumnoFicha(formData);
        setEditFichaOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la ficha.");
      }
    });
  }

  const [alumnoAEliminar, setAlumnoAEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const madre = selected?.contactos.find((c) => c.relacion === "Madre");
  const padre = selected?.contactos.find((c) => c.relacion === "Padre");

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* Lista de alumnos */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-[#0B1D4D]">{translate(locale, "tutorias.misAlumnos")}</h3>
        <div className="mb-3">
          <NuevoAlumnoModal />
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(locale, "tutorias.buscarAlumnoPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            {alumnos.length === 0 ? translate(locale, "tutorias.sinAlumnos") : translate(locale, "tutorias.sinResultados")}
          </p>
        ) : (
          <div className="max-h-[560px] space-y-1 overflow-y-auto">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/dashboard/tutorias?alumno=${a.id}`)}
                className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors ${
                  selected?.id === a.id ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  <span className="flex h-full w-full items-center justify-center">
                    {alumnoInitials(a.nombre)}
                  </span>
                  {a.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatarUrl}
                      alt={a.nombre}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-700">{a.nombre}</div>
                  <div className="text-xs text-slate-400">{a.curso}</div>
                </div>
                <span
                  title={translate(locale, "tutorias.totalTutorias")}
                  className="shrink-0 rounded-full bg-[#0B1D4D] px-1.5 py-0.5 text-[10px] font-bold text-white"
                >
                  {a.tutorias.length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ficha del alumno */}
      {!selected ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {alumnos.length === 0
            ? translate(locale, "tutorias.daDeAltaPrimerAlumno")
            : translate(locale, "tutorias.seleccionaAlumno")}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100 text-lg font-bold text-slate-500">
                  <span className="flex h-full w-full items-center justify-center">
                    {alumnoInitials(selected.nombre)}
                  </span>
                  {selected.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.avatarUrl}
                      alt={selected.nombre}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0B1D4D]">{selected.nombre}</h2>
                  <p className="text-sm text-slate-500">
                    {selected.curso}
                    {selected.edad ? ` · ${selected.edad} ${translate(locale, "tutorias.anios")}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{translate(locale, "tutorias.tutorLabel")} {tutorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${RIESGO_COLORS[selected.riesgo]}`}
                >
                  {translate(locale, `riesgo.${selected.riesgo}` as never)}
                </span>
                <button
                  onClick={() => setEditFichaOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> {translate(locale, "tutorias.editarFicha")}
                </button>
              </div>
            </div>

            {(madre || padre) && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {translate(locale, "tutorias.contactoFamiliar")}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[madre, padre].filter(Boolean).map((c) => (
                    <div key={c!.relacion} className="space-y-1 text-sm">
                      {c!.telefono && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {c!.telefono}
                          <span className="text-xs text-slate-400">{c!.relacion}</span>
                        </div>
                      )}
                      {c!.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" /> {c!.email}
                          <span className="text-xs text-slate-400">{c!.relacion}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B1D4D]">{translate(locale, "tutorias.historialTutorias")}</h3>
              <button
                onClick={() => setNuevaTutoriaOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
              >
                <Plus className="h-4 w-4" /> {translate(locale, "tutorias.registrarNuevaTutoria")}
              </button>
            </div>

            {selected.tutorias.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {translate(locale, "tutorias.sinTutoriasRegistradas")}
              </p>
            ) : (
              <div className="space-y-3">
                {selected.tutorias.map((t) => {
                  const date = new Date(t.sessionDate);
                  return (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <button
                        onClick={() => (t.status === "COMPLETADA" ? setViewingTutoria(t) : setEditingTutoria(t))}
                        className="flex flex-1 gap-3 text-left"
                      >
                        <div className="w-12 shrink-0 text-center">
                          <div className="text-lg font-bold text-slate-700">
                            {date.toLocaleDateString("es-ES", { day: "2-digit" })}
                          </div>
                          <div className="text-[10px] uppercase text-slate-400">
                            {date.toLocaleDateString("es-ES", { month: "short" })}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {STATUS_ICON[t.status]}
                            <span className="text-sm font-semibold text-slate-700">
                              {t.conQuien ? translate(locale, `conQuien.${t.conQuien}` as never) : translate(locale, "tutorias.tutoriaFallback")}
                            </span>
                            {t.medio && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                {translate(locale, `medio.${t.medio}` as never)}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TUTORIA_STATUS_COLORS[t.status]}`}
                            >
                              {translate(locale, `status.${t.status}` as never)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            <span className="font-medium text-slate-600">{translate(locale, "tutorias.colCausa")}:</span> {t.causa}
                          </p>
                          {t.status === "COMPLETADA" && t.notas && (
                            <p className="mt-1 text-xs text-slate-500">{t.notas}</p>
                          )}
                        </div>
                        {t.status === "COMPLETADA" ? (
                          <Eye className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        ) : (
                          <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        )}
                      </button>

                      {t.status === "PENDIENTE" && (
                        <button
                          onClick={() => {
                            setCerrarError(null);
                            setJustLength(0);
                            setCerrandoTutoria(t);
                          }}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" /> {translate(locale, "tutorias.cerrarTutoria")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: registrar nueva tutoría */}
      {nuevaTutoriaOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "tutorias.registrarNuevaTutoria")}</h2>
              <button
                onClick={() => setNuevaTutoriaOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <form action={handleCreateTutoria} className="space-y-4">
              <input type="hidden" name="alumnoId" value={selected.id} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.colFecha")}</label>
                  <input
                    name="fecha"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.hora")}</label>
                  <input
                    name="hora"
                    type="time"
                    required
                    defaultValue="09:00"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.conQuienLabel")}</label>
                <select
                  name="conQuien"
                  defaultValue="ALUMNO"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  {Object.keys(CON_QUIEN_LABELS).map((value) => (
                    <option key={value} value={value}>
                      {translate(locale, `conQuien.${value}` as never)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.medioLabel")}</label>
                <select
                  name="medio"
                  defaultValue="PRESENCIAL"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  {Object.keys(MEDIO_LABELS).map((value) => (
                    <option key={value} value={value}>
                      {translate(locale, `medio.${value}` as never)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "tutorias.causaDeLaTutoria")} <span className="text-red-500">*</span>
                </label>
                <input
                  name="causa"
                  required
                  placeholder={translate(locale, "tutorias.causaPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {translate(locale, "tutorias.seCrearaAviso1")} <strong>{translate(locale, "status.PENDIENTE")}</strong>. {translate(locale, "tutorias.seCrearaAviso2")}
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNuevaTutoriaOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending ? translate(locale, "tutorias.registrando") : translate(locale, "tutorias.registrarTutoria")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: editar ficha */}
      {editFichaOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "tutorias.editarFicha")}</h2>
              <button
                onClick={() => setEditFichaOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <form action={handleEditFicha} className="space-y-4">
              <input type="hidden" name="id" value={selected.id} />

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.nombre")}</label>
                <input
                  name="nombre"
                  required
                  defaultValue={selected.nombre}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "tutorias.cursoGrupo")}
                  </label>
                  <CursoSelect name="curso" defaultValue={selected.curso} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha de nacimiento</label>
                  <input
                    name="fechaNacimiento"
                    type="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    defaultValue={selected.fechaNacimiento ? selected.fechaNacimiento.slice(0, 10) : ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Documento</label>
                <DocumentoIdentidadInput defaultTipo={selected.tipoDocumento ?? "DNI"} defaultNumero={selected.numeroDocumento ?? ""} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Dirección</label>
                <input
                  name="direccion"
                  required
                  defaultValue={selected.direccion ?? ""}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "tutorias.nivelRiesgo")}
                </label>
                <select
                  name="riesgo"
                  defaultValue={selected.riesgo}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  {Object.keys(RIESGO_LABELS).map((value) => (
                    <option key={value} value={value}>
                      {translate(locale, `riesgo.${value}` as never)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">{translate(locale, "tutorias.contactoFamiliar")}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">{translate(locale, "tutorias.madre")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <PhoneInput name="madreTelefono" defaultValue={madre?.telefono ?? ""} required />
                      <input
                        name="madreEmail"
                        type="email"
                        required
                        defaultValue={madre?.email ?? ""}
                        placeholder={translate(locale, "tutorias.email")}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">{translate(locale, "tutorias.padre")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <PhoneInput name="padreTelefono" defaultValue={padre?.telefono ?? ""} required />
                      <input
                        name="padreEmail"
                        type="email"
                        required
                        defaultValue={padre?.email ?? ""}
                        placeholder={translate(locale, "tutorias.email")}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setAlumnoAEliminar(selected)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> {translate(locale, "tutorias.eliminarAlumno")}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditFichaOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {translate(locale, "common.cancelar")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                  >
                    {pending ? translate(locale, "common.guardando") : translate(locale, "tutorias.guardarCambios")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ver tutoría cerrada (solo lectura) */}
      {viewingTutoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "tutorias.tutoriaCerrada")}</h2>
              </div>
              <button
                onClick={() => setViewingTutoria(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 pl-11 text-xs text-slate-500">
              {translate(locale, "tutorias.tutoriaCompletadaNota")}
            </p>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.colFecha")}</div>
                  <div className="text-slate-700">
                    {new Date(viewingTutoria.sessionDate).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.hora")}</div>
                  <div className="text-slate-700">
                    {new Date(viewingTutoria.sessionDate).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.conQuienLabel")}</div>
                  <div className="text-slate-700">
                    {viewingTutoria.conQuien ? translate(locale, `conQuien.${viewingTutoria.conQuien}` as never) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.medioLabel")}</div>
                  <div className="text-slate-700">
                    {viewingTutoria.medio ? translate(locale, `medio.${viewingTutoria.medio}` as never) : "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">Causa</div>
                <div className="text-slate-700">{viewingTutoria.causa || "—"}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.resumenTutoriaLabel")}</div>
                <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-slate-700">
                  {viewingTutoria.notas || "—"}
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.proximoSeguimiento")}</div>
                <div className="text-slate-700">
                  {viewingTutoria.proximoSeguimiento
                    ? new Date(viewingTutoria.proximoSeguimiento).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : translate(locale, "tutorias.sinFechaIndicada")}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewingTutoria(null)}
                className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
              >
                {translate(locale, "common.cerrar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: editar datos básicos de una tutoría */}
      {editingTutoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "tutorias.editarTutoria")}</h2>
              <button
                onClick={() => setEditingTutoria(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <form action={handleEditTutoria} className="space-y-4">
              <input type="hidden" name="id" value={editingTutoria.id} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.colFecha")}</label>
                  <input
                    name="fecha"
                    type="date"
                    required
                    defaultValue={new Date(editingTutoria.sessionDate).toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.hora")}</label>
                  <input
                    name="hora"
                    type="time"
                    required
                    defaultValue={new Date(editingTutoria.sessionDate).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.conQuienLabel")}</label>
                <select
                  name="conQuien"
                  defaultValue={editingTutoria.conQuien ?? "ALUMNO"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  {Object.keys(CON_QUIEN_LABELS).map((value) => (
                    <option key={value} value={value}>
                      {translate(locale, `conQuien.${value}` as never)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "tutorias.medioLabel")}</label>
                <select
                  name="medio"
                  defaultValue={editingTutoria.medio ?? "PRESENCIAL"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  {Object.keys(MEDIO_LABELS).map((value) => (
                    <option key={value} value={value}>
                      {translate(locale, `medio.${value}` as never)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "tutorias.causaDeLaTutoria")} <span className="text-red-500">*</span>
                </label>
                <input
                  name="causa"
                  required
                  defaultValue={editingTutoria.causa}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteTutoria(editingTutoria.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> {translate(locale, "common.eliminar")}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTutoria(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {translate(locale, "common.cancelar")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                  >
                    {pending ? translate(locale, "common.guardando") : translate(locale, "tutorias.guardarCambios")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: cerrar tutoría (resumen + próximo seguimiento) */}
      {cerrandoTutoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "tutorias.cerrarTutoria")}</h2>
              </div>
              <button
                onClick={() => setCerrandoTutoria(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 pl-11 text-xs text-slate-500">
              {translate(locale, "tutorias.completaInfoCerrar")}
            </p>
            <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {translate(locale, "tutorias.avisoCerradaPre")} <strong>{translate(locale, "tutorias.avisoCerradaStrong")}</strong> {translate(locale, "tutorias.avisoCerradaPost")}
            </div>

            {cerrarError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {cerrarError}
              </div>
            )}

            <form action={handleCerrarTutoria} className="space-y-4">
              <input type="hidden" name="id" value={cerrandoTutoria.id} />

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "tutorias.resumenTutoriaLabel")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="notas"
                  required
                  maxLength={1000}
                  rows={5}
                  onChange={(e) => setJustLength(e.target.value.length)}
                  placeholder={translate(locale, "tutorias.resumenPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{justLength}/1000</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "tutorias.proximoSeguimiento")} <span className="text-slate-400">{translate(locale, "common.opcional")}</span>
                </label>
                <input
                  name="proximoSeguimiento"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {translate(locale, "tutorias.fechaProximoSeguimientoDesc")}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCerrandoTutoria(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={cerrando}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {cerrando ? translate(locale, "common.guardando") : translate(locale, "tutorias.guardarYCompletar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alumnoAEliminar && (
        <EliminarAlumnoModal
          alumno={alumnoAEliminar}
          onClose={() => setAlumnoAEliminar(null)}
          onEliminado={() => {
            setAlumnoAEliminar(null);
            setEditFichaOpen(false);
            router.push("/dashboard/tutorias");
          }}
        />
      )}
    </div>
  );
}
