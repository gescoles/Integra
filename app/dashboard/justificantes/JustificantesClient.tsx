"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, XCircle, ClipboardCheck, Bell, FileSpreadsheet } from "lucide-react";
import { obtenerHistorialJustificantes, crearJustificante, editarJustificante, eliminarJustificante } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";

type AlumnoLista = {
  id: string;
  nombre: string;
  curso: string;
  avatarUrl: string | null;
  tutorId: string;
  tutorNombre: string;
  totalJustificantes: number;
};

type Profesor = { id: string; nombre: string };

type Justificante = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  asignatura: string | null;
  entregado: boolean;
  creadoPorNombre: string;
  avisadoId: string | null;
  avisadoNombre: string | null;
};

type Ficha = {
  alumno: { id: string; nombre: string; curso: string; avatarUrl: string | null; tutorId: string; tutorNombre: string };
  puedeAnadir: boolean;
  justificantes: Justificante[];
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export function JustificantesClient({
  alumnos,
  profesoresFiltro,
  profesoresAvisar,
  currentUserId,
  esDirectivo,
  schoolId,
}: {
  alumnos: AlumnoLista[];
  profesoresFiltro: Profesor[];
  profesoresAvisar: Profesor[];
  currentUserId: string;
  esDirectivo: boolean;
  schoolId: string;
}) {
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {alumnoSeleccionadoId ? (
        <FichaAlumno alumnoId={alumnoSeleccionadoId} profesoresAvisar={profesoresAvisar} onVolver={() => setAlumnoSeleccionadoId(null)} />
      ) : (
        <ListaAlumnos
          alumnos={alumnos}
          profesores={profesoresFiltro}
          currentUserId={currentUserId}
          esDirectivo={esDirectivo}
          schoolId={schoolId}
          onElegirAlumno={setAlumnoSeleccionadoId}
        />
      )}
    </div>
  );
}

function ListaAlumnos({
  alumnos,
  profesores,
  currentUserId,
  esDirectivo,
  schoolId,
  onElegirAlumno,
}: {
  alumnos: AlumnoLista[];
  profesores: Profesor[];
  currentUserId: string;
  esDirectivo: boolean;
  schoolId: string;
  onElegirAlumno: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [tutorFiltro, setTutorFiltro] = useState("Todos");

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (tutorFiltro !== "Todos" && a.tutorId !== tutorFiltro) return false;
      if (q && !a.nombre.toLowerCase().includes(q) && !a.curso.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [alumnos, search, tutorFiltro]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno o curso..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>
        {esDirectivo && (
          <select
            value={tutorFiltro}
            onChange={(e) => setTutorFiltro(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
          >
            <option value="Todos">Todos los tutores</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        )}
        {esDirectivo && (
          <a
            href={`/api/justificantes/export?school=${schoolId}`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel
          </a>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          {alumnos.length === 0 ? "Todavía no hay alumnos en este centro." : "No hay alumnos que coincidan con la búsqueda."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-3 pr-4 font-medium">Alumno</th>
                <th className="pb-3 pr-4 font-medium">Curso</th>
                <th className="pb-3 pr-4 font-medium">Tutor/a</th>
                <th className="pb-3 pr-4 font-medium">Justificantes</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {a.avatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="font-semibold text-slate-700">{a.nombre}</span>
                      {a.tutorId === currentUserId && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-[#FD5249]">Mi tutorizado/a</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{a.curso}</td>
                  <td className="py-3 pr-4 text-slate-500">{a.tutorNombre}</td>
                  <td className="py-3 pr-4 text-slate-500">{a.totalJustificantes}</td>
                  <td className="py-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => onElegirAlumno(a.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]"
                      >
                        Ver ficha
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-400">Mostrando {filtrados.length} de {alumnos.length}</div>
    </div>
  );
}

function FichaAlumno({
  alumnoId,
  profesoresAvisar,
  onVolver,
}: {
  alumnoId: string;
  profesoresAvisar: Profesor[];
  onVolver: () => void;
}) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Justificante | null>(null);
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    setCargando(true);
    const data = await obtenerHistorialJustificantes(alumnoId);
    setFicha(data as Ficha | null);
    setCargando(false);
  }

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoId]);

  const justificantesFiltrados = useMemo(() => {
    if (!ficha) return [];
    if (!fechaFiltro) return ficha.justificantes;
    return ficha.justificantes.filter((j) => j.fecha.slice(0, 10) === fechaFiltro);
  }, [ficha, fechaFiltro]);

  async function handleEliminar(id: string) {
    setBorrandoId(id);
    setError(null);
    try {
      await eliminarJustificante(id);
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar el justificante.");
    } finally {
      setBorrandoId(null);
    }
  }

  return (
    <div>
      <button onClick={onVolver} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FD5249]">
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </button>

      {cargando || !ficha ? (
        <div className="py-16 text-center text-sm text-slate-400">{cargando ? "Cargando..." : "No se ha encontrado el alumno."}</div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                {ficha.alumno.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ficha.alumno.avatarUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B1D4D]">{ficha.alumno.nombre}</h3>
                <p className="text-xs text-slate-400">{ficha.alumno.curso} · Tutor/a: {ficha.alumno.tutorNombre}</p>
              </div>
            </div>
            {ficha.puedeAnadir && (
              <button
                onClick={() => setModalAbierto(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
              >
                <Plus className="h-4 w-4" /> Añadir justificante
              </button>
            )}
          </div>

          {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

          <div className="mb-4 flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-500">Consultar un día concreto</label>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#FD5249]"
            />
            {fechaFiltro && (
              <button onClick={() => setFechaFiltro("")} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                Quitar filtro
              </button>
            )}
          </div>

          {justificantesFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
              {fechaFiltro ? "No hay ningún justificante ese día." : "Todavía no hay ningún justificante registrado."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium">Franja horaria</th>
                    <th className="pb-3 pr-4 font-medium">Asignatura</th>
                    <th className="pb-3 pr-4 font-medium">Justificante</th>
                    <th className="pb-3 pr-4 font-medium">Registrado por</th>
                    <th className="pb-3 pr-4 font-medium">Avisado/a</th>
                    {ficha.puedeAnadir && <th className="pb-3 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {justificantesFiltrados.map((j) => (
                    <tr key={j.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-4 font-semibold text-slate-700">{formatFecha(j.fecha)}</td>
                      <td className="py-3 pr-4 text-slate-500">{j.horaInicio} – {j.horaFin}</td>
                      <td className="py-3 pr-4 text-slate-500">{j.asignatura ?? "—"}</td>
                      <td className="py-3 pr-4">
                        {j.entregado ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Entregado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                            <XCircle className="h-3.5 w-3.5" /> No entregado
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{j.creadoPorNombre}</td>
                      <td className="py-3 pr-4 text-slate-500">
                        {j.avisadoNombre ? (
                          <span className="inline-flex items-center gap-1">
                            <Bell className="h-3 w-3 text-slate-400" /> {j.avisadoNombre}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {ficha.puedeAnadir && (
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setEditando(j)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#FD5249]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleEliminar(j.id)}
                              disabled={borrandoId === j.id}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalAbierto && ficha && (
        <AnadirJustificanteModal
          alumnoId={ficha.alumno.id}
          profesoresAvisar={profesoresAvisar}
          onClose={() => setModalAbierto(false)}
          onGuardado={() => {
            setModalAbierto(false);
            recargar();
          }}
        />
      )}

      {editando && (
        <EditarJustificanteModal
          justificante={editando}
          profesoresAvisar={profesoresAvisar}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

function AnadirJustificanteModal({
  alumnoId,
  profesoresAvisar,
  onClose,
  onGuardado,
}: {
  alumnoId: string;
  profesoresAvisar: Profesor[];
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("alumnoId", alumnoId);
    setPending(true);
    setError(null);
    try {
      await crearJustificante(formData);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el justificante.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <ClipboardCheck className="h-5 w-5 text-[#FD5249]" />
        </div>
        <h3 className="mb-4 text-base font-bold text-[#0B1D4D]">Añadir justificante</h3>

        <form action={handleSubmit} className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Fecha</label>
            <input
              name="fecha"
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Desde</label>
              <input name="horaInicio" type="time" required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Hasta</label>
              <input name="horaFin" type="time" required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Asignatura</label>
            <input
              name="asignatura"
              placeholder="Ej. Matemáticas"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Avisar a (opcional)</label>
            <select
              name="avisadoId"
              defaultValue=""
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            >
              <option value="">Nadie — solo queda registrado</option>
              {profesoresAvisar.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Normalmente el profesor de esa asignatura — le llegará un email y una notificación con la hora justificada.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
            <input name="entregado" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#FD5249] focus:ring-[#FD5249]" />
            Ha entregado el justificante
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending && <ButtonSpinner />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditarJustificanteModal({
  justificante,
  profesoresAvisar,
  onClose,
  onGuardado,
}: {
  justificante: Justificante;
  profesoresAvisar: Profesor[];
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("id", justificante.id);
    setPending(true);
    setError(null);
    try {
      await editarJustificante(formData);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el justificante.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <Pencil className="h-5 w-5 text-[#FD5249]" />
        </div>
        <h3 className="mb-4 text-base font-bold text-[#0B1D4D]">Editar justificante</h3>

        <form action={handleSubmit} className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Fecha</label>
            <input
              name="fecha"
              type="date"
              required
              defaultValue={justificante.fecha.slice(0, 10)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Desde</label>
              <input
                name="horaInicio"
                type="time"
                required
                defaultValue={justificante.horaInicio}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Hasta</label>
              <input
                name="horaFin"
                type="time"
                required
                defaultValue={justificante.horaFin}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Asignatura</label>
            <input
              name="asignatura"
              placeholder="Ej. Matemáticas"
              defaultValue={justificante.asignatura ?? ""}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Avisar a (opcional)</label>
            <select
              name="avisadoId"
              defaultValue={justificante.avisadoId ?? ""}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            >
              <option value="">Nadie — solo queda registrado</option>
              {profesoresAvisar.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Si dejas a alguien puesto (o eliges a alguien nuevo), le llegará email y notificación con los datos actualizados.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
            <input name="entregado" type="checkbox" defaultChecked={justificante.entregado} className="h-4 w-4 rounded border-slate-300 text-[#FD5249] focus:ring-[#FD5249]" />
            Ha entregado el justificante
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending && <ButtonSpinner />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
