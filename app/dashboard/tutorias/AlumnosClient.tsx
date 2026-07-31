"use client";

import { useMemo, useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Phone,
  Mail,
  Pencil,
  Plus,
  X,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { NuevoAlumnoModal } from "./NuevoAlumnoModal";
import {
  createTutoriaAlumno,
  updateAlumnoFicha,
  updateTutoriaAlumno,
  deleteTutoriaAlumno,
  deleteAlumno,
} from "./alumnoActions";
import {
  RIESGO_LABELS,
  RIESGO_COLORS,
  CON_QUIEN_LABELS,
  MEDIO_LABELS,
} from "./alumnoConstants";

type Contacto = { id: string; relacion: string; telefono: string | null; email: string | null };
type TutoriaItem = {
  id: string;
  sessionDate: string;
  conQuien: string | null;
  medio: string | null;
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
  contactos: Contacto[];
  tutorias: TutoriaItem[];
};

const STATUS_ICON: Record<string, ReactElement> = {
  NUEVA: <MessageCircle className="h-4 w-4 text-[#2F6FED]" />,
  SEGUIMIENTO: <MessageCircle className="h-4 w-4 text-violet-500" />,
  COMPLETADA: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  PENDIENTE: <AlertTriangle className="h-4 w-4 text-amber-500" />,
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
  const [search, setSearch] = useState("");
  const [nuevaTutoriaOpen, setNuevaTutoriaOpen] = useState(false);
  const [editFichaOpen, setEditFichaOpen] = useState(false);
  const [editingTutoria, setEditingTutoria] = useState<TutoriaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  const [deleteAlumnoOpen, setDeleteAlumnoOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  function performDeleteAlumno(id: string) {
    startTransition(async () => {
      try {
        await deleteAlumno(id);
        setEditFichaOpen(false);
        setDeleteAlumnoOpen(false);
        router.push("/dashboard/tutorias");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar el alumno.");
      }
    });
  }

  function handleDeleteAlumno(id: string) {
    if (!selected) return;
    if (selected.tutorias.length === 0) {
      if (!confirm(`¿Eliminar a ${selected.nombre}? Esta acción no se puede deshacer.`)) return;
      performDeleteAlumno(id);
    } else {
      setError(null);
      setDeleteConfirmText("");
      setDeleteAlumnoOpen(true);
    }
  }
  const madre = selected?.contactos.find((c) => c.relacion === "Madre");
  const padre = selected?.contactos.find((c) => c.relacion === "Padre");

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* Lista de alumnos */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-[#0B1D4D]">Mis alumnos</h3>
        <div className="mb-3">
          <NuevoAlumnoModal />
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2F6FED]"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            {alumnos.length === 0 ? "Todavía no tienes alumnos dados de alta." : "Sin resultados."}
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
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-700">{a.nombre}</div>
                  <div className="text-xs text-slate-400">{a.curso}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ficha del alumno */}
      {!selected ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {alumnos.length === 0
            ? "Da de alta a tu primer alumno para empezar."
            : "Selecciona un alumno de la lista para ver su ficha."}
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
                    {selected.edad ? ` · ${selected.edad} años` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Tutor/a: {tutorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${RIESGO_COLORS[selected.riesgo]}`}
                >
                  {RIESGO_LABELS[selected.riesgo]}
                </span>
                <button
                  onClick={() => setEditFichaOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar ficha
                </button>
              </div>
            </div>

            {(madre || padre) && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Contacto familiar
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
              <h3 className="text-sm font-bold text-[#0B1D4D]">Historial de tutorías</h3>
              <button
                onClick={() => setNuevaTutoriaOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
              >
                <Plus className="h-4 w-4" /> Registrar nueva tutoría
              </button>
            </div>

            {selected.tutorias.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Todavía no hay tutorías registradas para este alumno.
              </p>
            ) : (
              <div className="space-y-3">
                {selected.tutorias.map((t) => {
                  const date = new Date(t.sessionDate);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setEditingTutoria(t)}
                      className="flex w-full gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-[#2F6FED]"
                    >
                      <div className="w-12 shrink-0 text-center">
                        <div className="text-lg font-bold text-slate-700">
                          {date.toLocaleDateString("es-ES", { day: "2-digit" })}
                        </div>
                        <div className="text-[10px] uppercase text-slate-400">
                          {date.toLocaleDateString("es-ES", { month: "short" })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {STATUS_ICON[t.status]}
                          <span className="text-sm font-semibold text-slate-700">
                            Tutoría {t.conQuien ? `· ${CON_QUIEN_LABELS[t.conQuien]}` : ""}
                          </span>
                          {t.medio && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              {MEDIO_LABELS[t.medio]}
                            </span>
                          )}
                        </div>
                        {t.notas && <p className="mt-1 text-xs text-slate-500">{t.notas}</p>}
                      </div>
                      <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    </button>
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
              <h2 className="text-lg font-bold text-[#0B1D4D]">Registrar nueva tutoría</h2>
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
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha</label>
                  <input
                    name="fecha"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Hora</label>
                  <input
                    name="hora"
                    type="time"
                    required
                    defaultValue="09:00"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Con quién</label>
                <select
                  name="conQuien"
                  defaultValue="ALUMNO"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {Object.entries(CON_QUIEN_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Medio</label>
                <select
                  name="medio"
                  defaultValue="PRESENCIAL"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {Object.entries(MEDIO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Resumen de la tutoría <span className="text-red-500">*</span>
                </label>
                <p className="mb-1.5 text-xs text-slate-400">
                  ¿Qué se ha hablado? Anota los puntos clave, acuerdos y cómo ha ido.
                </p>
                <textarea
                  name="notas"
                  required
                  rows={5}
                  minLength={10}
                  placeholder="Ej. Hemos hablado sobre su falta de concentración en clase y la importancia de la organización del estudio. Se acuerda revisar la agenda semanalmente..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Próximo seguimiento <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  name="proximoSeguimiento"
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNuevaTutoriaOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                >
                  {pending ? "Registrando..." : "Registrar tutoría"}
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
              <h2 className="text-lg font-bold text-[#0B1D4D]">Editar ficha</h2>
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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  name="nombre"
                  required
                  defaultValue={selected.nombre}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Curso / Grupo
                  </label>
                  <input
                    name="curso"
                    required
                    defaultValue={selected.curso}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Edad</label>
                  <input
                    name="edad"
                    type="number"
                    defaultValue={selected.edad ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nivel de riesgo
                </label>
                <select
                  name="riesgo"
                  defaultValue={selected.riesgo}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {Object.entries(RIESGO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Contacto familiar</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Madre</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        name="madreTelefono"
                        defaultValue={madre?.telefono ?? ""}
                        placeholder="Teléfono"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                      />
                      <input
                        name="madreEmail"
                        type="email"
                        defaultValue={madre?.email ?? ""}
                        placeholder="Email"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Padre</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        name="padreTelefono"
                        defaultValue={padre?.telefono ?? ""}
                        placeholder="Teléfono"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                      />
                      <input
                        name="padreEmail"
                        type="email"
                        defaultValue={padre?.email ?? ""}
                        placeholder="Email"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteAlumno(selected.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar alumno
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditFichaOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                  >
                    {pending ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: editar/eliminar tutoría */}
      {editingTutoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Editar tutoría</h2>
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
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha</label>
                  <input
                    name="fecha"
                    type="date"
                    required
                    defaultValue={new Date(editingTutoria.sessionDate).toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Hora</label>
                  <input
                    name="hora"
                    type="time"
                    required
                    defaultValue={new Date(editingTutoria.sessionDate).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Con quién</label>
                <select
                  name="conQuien"
                  defaultValue={editingTutoria.conQuien ?? "ALUMNO"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {Object.entries(CON_QUIEN_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Medio</label>
                <select
                  name="medio"
                  defaultValue={editingTutoria.medio ?? "PRESENCIAL"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {Object.entries(MEDIO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Estado</label>
                <select
                  name="status"
                  defaultValue={editingTutoria.status}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                >
                  <option value="NUEVA">Nueva</option>
                  <option value="SEGUIMIENTO">En seguimiento</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="PENDIENTE">Pendiente</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Resumen de la tutoría <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="notas"
                  required
                  minLength={10}
                  rows={5}
                  defaultValue={editingTutoria.notas ?? ""}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Próximo seguimiento <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  name="proximoSeguimiento"
                  type="date"
                  defaultValue={
                    editingTutoria.proximoSeguimiento
                      ? new Date(editingTutoria.proximoSeguimiento).toISOString().slice(0, 10)
                      : ""
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteTutoria(editingTutoria.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTutoria(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                  >
                    {pending ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: confirmación fuerte para eliminar alumno con tutorías */}
      {deleteAlumnoOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0B1D4D]">Eliminar alumno</h2>
                <p className="mt-1 text-sm text-slate-600">
                  <strong>{selected.nombre}</strong> tiene{" "}
                  <strong>
                    {selected.tutorias.length} tutoría{selected.tutorias.length === 1 ? "" : "s"} registrada
                    {selected.tutorias.length === 1 ? "" : "s"}
                  </strong>
                  . Si continúas, se eliminará el alumno <strong>y todas sus tutorías</strong>, en todos los sitios
                  (historial, calendario e Inicio). Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
            )}

            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Escribe <span className="font-mono text-red-600">eliminar {selected.nombre}</span> para
              confirmar
            </label>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`eliminar ${selected.nombre}`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-400"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteAlumnoOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  pending ||
                  deleteConfirmText.trim().toLowerCase() !== `eliminar ${selected.nombre}`.toLowerCase()
                }
                onClick={() => performDeleteAlumno(selected.id)}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
