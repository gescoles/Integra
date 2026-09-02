"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, UserPlus } from "lucide-react";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { obtenerCategoriasPorDepartamento, obtenerCatalogoPorCategoria } from "./actions";
import { asignarCertificacionAProfesor, eliminarAsignacion } from "./asignaciones";

type Departamento = { id: string; nombre: string };
type Profesor = { id: string; nombre: string };
type AsignacionExistente = {
  id: string;
  profesorNombre: string;
  cursoNombre: string;
  categoria: string;
  asignadoPorNombre: string;
  asignadoEl: string;
  programada: boolean;
};

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]";

export function AsignarCursosClient({
  departamentos,
  profesores,
  asignaciones,
}: {
  departamentos: Departamento[];
  profesores: Profesor[];
  asignaciones: AsignacionExistente[];
}) {
  const router = useRouter();
  const [profesorId, setProfesorId] = useState("");
  const [departamentoId, setDepartamentoId] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoria, setCategoria] = useState("");
  const [cursos, setCursos] = useState<{ id: string; nombre: string }[]>([]);
  const [catalogoId, setCatalogoId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  useEffect(() => {
    if (!departamentoId) {
      setCategorias([]);
      setCategoria("");
      return;
    }
    obtenerCategoriasPorDepartamento(departamentoId).then((lista) => {
      setCategorias(lista);
      setCategoria("");
    });
  }, [departamentoId]);

  useEffect(() => {
    if (!categoria) {
      setCursos([]);
      setCatalogoId("");
      return;
    }
    obtenerCatalogoPorCategoria(categoria, departamentoId).then((lista) => {
      setCursos(lista.map((c) => ({ id: c.id, nombre: c.nombre })));
      setCatalogoId("");
    });
  }, [categoria, departamentoId]);

  async function handleAsignar(e: React.FormEvent) {
    e.preventDefault();
    if (!profesorId || !catalogoId) {
      setError("Elige el profesor y el curso.");
      return;
    }
    setPending(true);
    setError(null);
    setExito(null);
    const formData = new FormData();
    formData.set("profesorId", profesorId);
    formData.set("catalogoId", catalogoId);
    try {
      await asignarCertificacionAProfesor(formData);
      setExito("Curso asignado. El profesor ha recibido el aviso.");
      setProfesorId("");
      setDepartamentoId("");
      setCategoria("");
      setCatalogoId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asignar.");
    } finally {
      setPending(false);
    }
  }

  async function handleQuitar(id: string) {
    try {
      await eliminarAsignacion(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar.");
    }
  }

  const pendientes = asignaciones.filter((a) => !a.programada);
  const yaProgramadas = asignaciones.filter((a) => a.programada);

  return (
    <div>
      <form onSubmit={handleAsignar} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Profesor</label>
          <select value={profesorId} onChange={(e) => setProfesorId(e.target.value)} className={inputClass}>
            <option value="">Selecciona...</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Departamento</label>
          <select value={departamentoId} onChange={(e) => setDepartamentoId(e.target.value)} className={inputClass}>
            <option value="">Selecciona...</option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={!departamentoId} className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}>
            <option value="">{departamentoId ? "Selecciona..." : "Elige antes un departamento"}</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Curso</label>
          <select value={catalogoId} onChange={(e) => setCatalogoId(e.target.value)} disabled={!categoria} className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}>
            <option value="">{categoria ? "Selecciona..." : "Elige antes una categoría"}</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {exito && <p className="mb-2 text-sm text-emerald-600">{exito}</p>}
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
          >
            {pending ? <ButtonSpinner /> : <UserPlus className="h-4 w-4" />} Asignar
          </button>
        </div>
      </form>

      <h3 className="mb-2 text-sm font-bold text-[#0B1D4D]">Pendientes de programar ({pendientes.length})</h3>
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {pendientes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No hay ninguna asignación pendiente.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-3 font-medium">Profesor</th>
                <th className="px-4 py-3 font-medium">Curso</th>
                <th className="px-4 py-3 font-medium">Asignado por</th>
                <th className="px-4 py-3 font-medium">Cuándo</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pendientes.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-700">{a.profesorNombre}</td>
                  <td className="px-4 py-3 text-slate-500">{a.cursoNombre}</td>
                  <td className="px-4 py-3 text-slate-500">{a.asignadoPorNombre}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(a.asignadoEl).toLocaleDateString("es-ES")}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleQuitar(a.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 className="mb-2 text-sm font-bold text-[#0B1D4D]">Ya programadas por el profesor ({yaProgramadas.length})</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {yaProgramadas.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Ninguna asignación se ha programado todavía.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-3 font-medium">Profesor</th>
                <th className="px-4 py-3 font-medium">Curso</th>
                <th className="px-4 py-3 font-medium">Asignado por</th>
              </tr>
            </thead>
            <tbody>
              {yaProgramadas.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-700">{a.profesorNombre}</td>
                  <td className="px-4 py-3 text-slate-500">{a.cursoNombre}</td>
                  <td className="px-4 py-3 text-slate-500">{a.asignadoPorNombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
