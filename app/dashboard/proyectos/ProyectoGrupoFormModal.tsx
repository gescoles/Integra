"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { crearProyectoGrupo, actualizarProyectoGrupo, obtenerAlumnosPorCiclo } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";

export type TipoNota = { id: string; nombre: string; porcentaje: number };

export type ProyectoGrupoEditable = {
  id: string;
  nombre: string;
  alumnosIds: string[];
  fechaEntrega: string;
  comentarios: string;
  notas: { tipoNotaId: string; valor: number | null; comentario: string | null }[];
};

export function ProyectoGrupoFormModal({
  proyectoId,
  ciclo,
  tiposNota,
  schoolId,
  editing,
  onClose,
}: {
  proyectoId: string;
  ciclo: string;
  tiposNota: TipoNota[];
  schoolId?: string;
  editing: ProyectoGrupoEditable | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [alumnosDisponibles, setAlumnosDisponibles] = useState<{ id: string; nombre: string; curso: string }[]>([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(true);
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<Set<string>>(new Set(editing?.alumnosIds ?? []));
  // Un valor/comentario por cada tipo de nota de la rúbrica del proyecto
  // (fija, no se puede tocar aquí) — se inicializa con lo ya guardado si
  // se está editando, o en blanco si es un grupo nuevo.
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const t of tiposNota) {
      const existente = editing?.notas.find((n) => n.tipoNotaId === t.id);
      inicial[t.id] = existente?.valor === null || existente?.valor === undefined ? "" : String(existente.valor);
    }
    return inicial;
  });
  const [comentariosNota, setComentariosNota] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const t of tiposNota) {
      const existente = editing?.notas.find((n) => n.tipoNotaId === t.id);
      inicial[t.id] = existente?.comentario ?? "";
    }
    return inicial;
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargandoAlumnos(true);
    obtenerAlumnosPorCiclo(ciclo, schoolId).then((alumnos) => {
      if (!cancelado) {
        setAlumnosDisponibles(alumnos);
        setCargandoAlumnos(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [ciclo, schoolId]);

  function toggleAlumno(id: string) {
    setAlumnosSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClose() {
    if (pending) return;
    onClose();
  }

  const notaFinalPreview = (() => {
    if (tiposNota.some((t) => valores[t.id] === "" || valores[t.id] === undefined)) return null;
    const suma = tiposNota.reduce((s, t) => s + Number(valores[t.id]) * t.porcentaje, 0);
    return Math.round((suma / 100) * 100) / 100;
  })();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      Array.from(alumnosSeleccionados).forEach((id) => formData.append("alumnosIds", id));
      formData.set(
        "notas",
        JSON.stringify(
          tiposNota.map((t) => ({
            tipoNotaId: t.id,
            valor: valores[t.id] === "" ? null : Number(valores[t.id]),
            comentario: comentariosNota[t.id]?.trim() || null,
          }))
        )
      );

      if (editing) {
        await actualizarProyectoGrupo(editing.id, formData);
      } else {
        await crearProyectoGrupo(proyectoId, formData);
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el grupo.");
    } finally {
      setPending(false);
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{editing ? "Editar grupo" : "Nuevo grupo"}</h2>
          <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
          {schoolId && <input type="hidden" name="schoolId" value={schoolId} />}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Nombre del grupo <span className="text-red-500">*</span>
            </label>
            <input
              name="nombre"
              required
              defaultValue={editing?.nombre ?? ""}
              placeholder="Ej. Grup 3 - App de reserves"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Alumnos <span className="text-red-500">*</span>
            </label>
            {cargandoAlumnos ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                Cargando alumnos...
              </p>
            ) : alumnosDisponibles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                No hay ningún alumno registrado en ese ciclo todavía.
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {alumnosDisponibles.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-600 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={alumnosSeleccionados.has(a.id)}
                      onChange={() => toggleAlumno(a.id)}
                      className="rounded border-slate-300 accent-[#FD5249]"
                    />
                    {a.nombre}
                  </label>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">{alumnosSeleccionados.size} alumno(s) seleccionado(s).</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Fecha de entrega <span className="text-red-500">*</span>
            </label>
            <input
              name="fechaEntrega"
              type="date"
              required
              defaultValue={editing?.fechaEntrega.slice(0, 10) ?? hoy}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notas</label>
            <div className="space-y-2">
              {tiposNota.map((t) => (
                <div key={t.id} className="grid grid-cols-[1fr_5rem_1fr] items-center gap-2 rounded-lg border border-slate-100 p-2.5">
                  <div className="text-xs font-medium text-slate-600">
                    {t.nombre} <span className="text-slate-400">({t.porcentaje}%)</span>
                  </div>
                  <input
                    type="number"
                    required
                    min={0}
                    max={10}
                    step="0.1"
                    value={valores[t.id] ?? ""}
                    onChange={(e) => setValores((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="Nota 0-10"
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#FD5249]"
                  />
                  <input
                    value={comentariosNota[t.id] ?? ""}
                    onChange={(e) => setComentariosNota((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="Comentario (opcional)"
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#FD5249]"
                  />
                </div>
              ))}
            </div>

            {notaFinalPreview !== null && (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Nota final: {notaFinalPreview}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Comentarios <span className="text-red-500">*</span>
            </label>
            <textarea
              name="comentarios"
              required
              rows={3}
              defaultValue={editing?.comentarios ?? ""}
              placeholder="Valoración general del grupo..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending && <ButtonSpinner />}
              {pending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
