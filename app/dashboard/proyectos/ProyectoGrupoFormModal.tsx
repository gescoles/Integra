"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";
import { crearProyectoGrupo, actualizarProyectoGrupo, obtenerAlumnosPorCiclo, obtenerPlantillaNotas } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";

export type NotaFila = { nombre: string; porcentaje: string; valor: string; comentario: string };

export type ProyectoGrupoEditable = {
  id: string;
  nombre: string;
  ciclo: string;
  alumnosIds: string[];
  fechaEntrega: string;
  comentarios: string;
  notas: { nombre: string; porcentaje: number; valor: number | null; comentario: string | null }[];
};

function filaVacia(): NotaFila {
  return { nombre: "", porcentaje: "", valor: "", comentario: "" };
}

export function ProyectoGrupoFormModal({
  ventanaId,
  ciclosCentro,
  schoolId,
  editing,
  onClose,
}: {
  ventanaId: string;
  ciclosCentro: string[];
  schoolId?: string;
  editing: ProyectoGrupoEditable | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [ciclo, setCiclo] = useState(editing?.ciclo ?? "");
  const [alumnosDisponibles, setAlumnosDisponibles] = useState<{ id: string; nombre: string; curso: string }[]>([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<Set<string>>(new Set(editing?.alumnosIds ?? []));
  const [notas, setNotas] = useState<NotaFila[]>(
    editing && editing.notas.length > 0
      ? editing.notas.map((n) => ({
          nombre: n.nombre,
          porcentaje: String(n.porcentaje),
          valor: n.valor === null ? "" : String(n.valor),
          comentario: n.comentario ?? "",
        }))
      : [filaVacia()]
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Si el usuario ya ha escrito algo en "Tipos de nota" para el ciclo
  // recién elegido, la plantilla (que tarda un poco en llegar del
  // servidor) no debe pisárselo al llegar tarde.
  const notasTocadasRef = useRef(false);

  useEffect(() => {
    if (!ciclo) {
      setAlumnosDisponibles([]);
      return;
    }
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

  // Al crear un grupo nuevo (no al editar uno ya existente), en cuanto se
  // elige el ciclo se recupera la rúbrica del último grupo creado en ese
  // mismo ciclo dentro de esta ventana — así, a partir del segundo grupo,
  // los tipos de nota y sus porcentajes ya salen puestos y solo hace
  // falta elegir alumnos y poner las notas de este grupo en concreto.
  useEffect(() => {
    if (editing || !ciclo) return;
    notasTocadasRef.current = false;
    let cancelado = false;
    obtenerPlantillaNotas(ventanaId, ciclo, schoolId).then((plantilla) => {
      // Si mientras se cargaba la plantilla el usuario ya ha escrito algo
      // a mano, no se lo pisamos aunque la respuesta llegue después.
      if (cancelado || notasTocadasRef.current) return;
      setNotas(
        plantilla.length > 0
          ? plantilla.map((p) => ({ nombre: p.nombre, porcentaje: String(p.porcentaje), valor: "", comentario: "" }))
          : [filaVacia()]
      );
    });
    return () => {
      cancelado = true;
    };
  }, [ciclo, ventanaId, schoolId, editing]);

  function toggleAlumno(id: string) {
    setAlumnosSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function actualizarNota(index: number, campo: keyof NotaFila, valor: string) {
    notasTocadasRef.current = true;
    setNotas((prev) => prev.map((n, i) => (i === index ? { ...n, [campo]: valor } : n)));
  }

  function anadirNota() {
    notasTocadasRef.current = true;
    setNotas((prev) => [...prev, filaVacia()]);
  }

  function quitarNota(index: number) {
    notasTocadasRef.current = true;
    // Siempre tiene que quedar al menos un tipo de nota — todos los
    // campos del proyecto son obligatorios, este incluido.
    setNotas((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const totalPorcentaje = notas.reduce((s, n) => s + (Number(n.porcentaje) || 0), 0);
  const porcentajeCompleto = notas.length > 0 && Math.abs(totalPorcentaje - 100) < 0.01;
  const todasCompletas = notas.length > 0 && notas.every((n) => n.nombre.trim() && n.valor !== "" && n.comentario.trim());
  const notaFinalPreview =
    porcentajeCompleto && todasCompletas
      ? Math.round(
          (notas.reduce((s, n) => s + Number(n.valor) * (Number(n.porcentaje) || 0), 0) / 100) * 100
        ) / 100
      : null;

  function handleClose() {
    if (pending) return;
    onClose();
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      Array.from(alumnosSeleccionados).forEach((id) => formData.append("alumnosIds", id));
      formData.set(
        "notas",
        JSON.stringify(
          notas
            .filter((n) => n.nombre.trim() || n.porcentaje.trim())
            .map((n) => ({
              nombre: n.nombre.trim(),
              porcentaje: Number(n.porcentaje) || 0,
              valor: n.valor === "" ? null : Number(n.valor),
              comentario: n.comentario.trim() || null,
            }))
        )
      );

      if (editing) {
        await actualizarProyectoGrupo(editing.id, formData);
      } else {
        formData.set("ventanaId", ventanaId);
        await crearProyectoGrupo(formData);
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el proyecto.");
    } finally {
      setPending(false);
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{editing ? "Editar proyecto" : "Nuevo grupo/proyecto"}</h2>
          <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
          {schoolId && <input type="hidden" name="schoolId" value={schoolId} />}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Nombre del grupo/proyecto <span className="text-red-500">*</span>
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
                Ciclo <span className="text-red-500">*</span>
              </label>
              <select
                name="ciclo"
                required
                value={ciclo}
                onChange={(e) => {
                  setCiclo(e.target.value);
                  setAlumnosSeleccionados(new Set());
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              >
                <option value="" disabled>
                  Elige un ciclo...
                </option>
                {ciclosCentro.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Alumnos <span className="text-red-500">*</span>
            </label>
            {!ciclo ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                Elige primero un ciclo para ver sus alumnos.
              </p>
            ) : cargandoAlumnos ? (
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
                    {a.nombre} <span className="text-xs text-slate-400">· {a.curso}</span>
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
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">Tipos de nota</label>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  notas.length === 0
                    ? "bg-slate-100 text-slate-400"
                    : porcentajeCompleto
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {totalPorcentaje}% {porcentajeCompleto ? "✓" : "(tiene que sumar 100%)"}
              </span>
            </div>

            <div className="space-y-2">
              {notas.map((n, i) => (
                <div key={i} className="grid grid-cols-[1fr_5rem_5rem_1fr_auto] items-start gap-2 rounded-lg border border-slate-100 p-2.5">
                  <input
                    required
                    value={n.nombre}
                    onChange={(e) => actualizarNota(i, "nombre", e.target.value)}
                    placeholder="Nombre (ej. Memoria)"
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#FD5249]"
                  />
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={n.porcentaje}
                    onChange={(e) => actualizarNota(i, "porcentaje", e.target.value)}
                    placeholder="%"
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#FD5249]"
                  />
                  <input
                    type="number"
                    required
                    min={0}
                    max={10}
                    step="0.1"
                    value={n.valor}
                    onChange={(e) => actualizarNota(i, "valor", e.target.value)}
                    placeholder="Nota 0-10"
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#FD5249]"
                  />
                  <input
                    required
                    value={n.comentario}
                    onChange={(e) => actualizarNota(i, "comentario", e.target.value)}
                    placeholder="Comentario"
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#FD5249]"
                  />
                  <button
                    type="button"
                    onClick={() => quitarNota(i)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={anadirNota}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-[#FD5249] hover:text-[#FD5249]"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir tipo de nota
            </button>

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
              placeholder="Valoración general del grupo/proyecto..."
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
