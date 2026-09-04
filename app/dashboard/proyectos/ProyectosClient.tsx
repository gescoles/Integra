"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { eliminarProyectoGrupo } from "./actions";
import { ProyectoGrupoFormModal, type ProyectoGrupoEditable } from "./ProyectoGrupoFormModal";
import { ProyectoGrupoDetalleModal } from "./ProyectoGrupoDetalleModal";
import { formatearCiclo } from "./cicloFormat";

type Grupo = {
  id: string;
  nombre: string;
  ciclo: string;
  fechaEntrega: string;
  comentarios: string;
  notaFinal: number | null;
  creadoPorId: string;
  creadoPorNombre: string;
  alumnosIds: string[];
  alumnosNombres: string[];
  notas: { id: string; nombre: string; porcentaje: number; valor: number | null; comentario: string | null }[];
};

export function ProyectosClient({
  grupos,
  ciclosCentro,
  ventanaId,
  esDirectivo,
  currentUserId,
  schoolId,
  filtros,
}: {
  grupos: Grupo[];
  ciclosCentro: { value: string; label: string }[];
  ventanaId: string;
  esDirectivo: boolean;
  currentUserId: string;
  schoolId?: string;
  filtros?: { ciclo?: string; nombre?: string };
}) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState<"nuevo" | "editar" | null>(null);
  const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null);
  const [grupoDetalle, setGrupoDetalle] = useState<Grupo | null>(null);
  // Filtros como componentes controlados (no defaultValue): así, si se
  // navega hacia atrás/adelante o cambia la URL por otra vía, el
  // desplegable/campo siempre refleja el filtro real que está aplicado
  // — con defaultValue el valor visible se queda congelado en el que
  // tenía al montarse la primera vez.
  const [cicloFiltro, setCicloFiltro] = useState(filtros?.ciclo ?? "");
  const [nombreFiltro, setNombreFiltro] = useState(filtros?.nombre ?? "");
  const nombreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCicloFiltro(filtros?.ciclo ?? "");
    setNombreFiltro(filtros?.nombre ?? "");
  }, [filtros?.ciclo, filtros?.nombre]);

  function actualizarFiltro(clave: "ciclo" | "nombre", valor: string) {
    const params = new URLSearchParams(window.location.search);
    if (valor) params.set(clave, valor);
    else params.delete(clave);
    router.push(`/dashboard/proyectos?${params.toString()}`);
  }

  function handleCicloFiltroChange(valor: string) {
    setCicloFiltro(valor);
    actualizarFiltro("ciclo", valor);
  }

  function handleNombreFiltroChange(valor: string) {
    setNombreFiltro(valor);
    // Se aplica solo, sin esperar a salir del campo — con un pequeño
    // margen para no disparar una navegación por cada letra tecleada.
    if (nombreDebounceRef.current) clearTimeout(nombreDebounceRef.current);
    nombreDebounceRef.current = setTimeout(() => actualizarFiltro("nombre", valor), 400);
  }

  async function handleEliminar(g: Grupo) {
    if (!confirm(`¿Eliminar "${g.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarProyectoGrupo(g.id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  }

  function abrirEditar(g: Grupo) {
    setGrupoEditando(g);
    setModalAbierto("editar");
  }

  function cerrarModal() {
    setModalAbierto(null);
    setGrupoEditando(null);
  }

  const editable: ProyectoGrupoEditable | null = grupoEditando
    ? {
        id: grupoEditando.id,
        nombre: grupoEditando.nombre,
        ciclo: grupoEditando.ciclo,
        alumnosIds: grupoEditando.alumnosIds,
        fechaEntrega: grupoEditando.fechaEntrega,
        comentarios: grupoEditando.comentarios,
        notas: grupoEditando.notas,
      }
    : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {esDirectivo ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={cicloFiltro}
              onChange={(e) => handleCicloFiltroChange(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#FD5249]"
            >
              <option value="">Todos los ciclos</option>
              {ciclosCentro.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              value={nombreFiltro}
              onChange={(e) => handleNombreFiltroChange(e.target.value)}
              placeholder="Buscar por nombre de proyecto..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#FD5249]"
            />
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={() => setModalAbierto("nuevo")}
          disabled={!ventanaId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Nuevo grupo
        </button>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Todavía no hay ningún proyecto en esta ventana.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Ciclo</th>
                <th className="px-4 py-3 font-medium">Alumnos</th>
                <th className="px-4 py-3 font-medium">Entrega</th>
                <th className="px-4 py-3 font-medium">Nota final</th>
                {esDirectivo && <th className="px-4 py-3 font-medium">Creado por</th>}
                <th className="w-28 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <tr key={g.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-700">{g.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{formatearCiclo(g.ciclo)}</td>
                  <td className="px-4 py-3 text-slate-500">{g.alumnosNombres.length}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(g.fechaEntrega).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-3">
                    {g.notaFinal !== null ? (
                      <span className="font-semibold text-[#0B1D4D]">{g.notaFinal}</span>
                    ) : (
                      <span className="text-xs text-amber-600">Pendiente</span>
                    )}
                  </td>
                  {esDirectivo && <td className="px-4 py-3 text-xs text-slate-500">{g.creadoPorNombre}</td>}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setGrupoDetalle(g)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {(esDirectivo || g.creadoPorId === currentUserId) && (
                        <>
                          <button
                            onClick={() => abrirEditar(g)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminar(g)}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto === "nuevo" && (
        <ProyectoGrupoFormModal ventanaId={ventanaId} ciclosCentro={ciclosCentro} schoolId={schoolId} editing={null} onClose={cerrarModal} />
      )}
      {modalAbierto === "editar" && editable && (
        <ProyectoGrupoFormModal ventanaId={ventanaId} ciclosCentro={ciclosCentro} schoolId={schoolId} editing={editable} onClose={cerrarModal} />
      )}
      {grupoDetalle && <ProyectoGrupoDetalleModal grupo={grupoDetalle} onClose={() => setGrupoDetalle(null)} />}
    </div>
  );
}
