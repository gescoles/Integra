"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { eliminarProyecto, eliminarProyectoGrupo } from "./actions";
import { ProyectoFormModal } from "./ProyectoFormModal";
import { ProyectoGrupoFormModal, type ProyectoGrupoEditable, type TipoNota } from "./ProyectoGrupoFormModal";
import { ProyectoGrupoDetalleModal } from "./ProyectoGrupoDetalleModal";
import { formatearCiclo } from "./cicloFormat";

type Grupo = {
  id: string;
  nombre: string;
  fechaEntrega: string;
  comentarios: string;
  notaFinal: number | null;
  creadoPorId: string;
  creadoPorNombre: string;
  alumnosIds: string[];
  alumnosNombres: string[];
  notas: { id: string; tipoNotaId: string; valor: number | null; comentario: string | null }[];
};

type ProyectoRow = {
  id: string;
  ciclo: string;
  creadoPorId: string;
  creadoPorNombre: string;
  tiposNota: TipoNota[];
  grupos: Grupo[];
};

export function ProyectosClient({
  proyectos,
  ciclosCentro,
  ventanaId,
  esDirectivo,
  currentUserId,
  schoolId,
  filtros,
}: {
  proyectos: ProyectoRow[];
  ciclosCentro: { value: string; label: string }[];
  ventanaId: string;
  esDirectivo: boolean;
  currentUserId: string;
  schoolId?: string;
  filtros?: { ciclo?: string; nombre?: string };
}) {
  const router = useRouter();
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set(proyectos.map((p) => p.id)));
  const [modalNuevoProyecto, setModalNuevoProyecto] = useState(false);
  const [grupoModal, setGrupoModal] = useState<{ proyecto: ProyectoRow; editing: ProyectoGrupoEditable | null } | null>(null);
  const [detalle, setDetalle] = useState<{ grupo: Grupo; tiposNota: TipoNota[] } | null>(null);

  const [cicloFiltro, setCicloFiltro] = useState(filtros?.ciclo ?? "");
  const [nombreFiltro, setNombreFiltro] = useState(filtros?.nombre ?? "");
  const nombreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCicloFiltro(filtros?.ciclo ?? "");
    setNombreFiltro(filtros?.nombre ?? "");
  }, [filtros?.ciclo, filtros?.nombre]);

  // Cualquier proyecto nuevo que llegue (recién creado) se expande solo.
  useEffect(() => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      for (const p of proyectos) next.add(p.id);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectos.length]);

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
    if (nombreDebounceRef.current) clearTimeout(nombreDebounceRef.current);
    nombreDebounceRef.current = setTimeout(() => actualizarFiltro("nombre", valor), 400);
  }

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEliminarProyecto(p: ProyectoRow) {
    if (!confirm(`¿Eliminar el proyecto de "${formatearCiclo(p.ciclo)}"? Solo se puede si no tiene ningún grupo dentro.`)) return;
    try {
      await eliminarProyecto(p.id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  }

  async function handleEliminarGrupo(g: Grupo) {
    if (!confirm(`¿Eliminar el grupo "${g.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarProyectoGrupo(g.id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  }

  function abrirNuevoGrupo(p: ProyectoRow) {
    setGrupoModal({ proyecto: p, editing: null });
  }

  function abrirEditarGrupo(p: ProyectoRow, g: Grupo) {
    setGrupoModal({
      proyecto: p,
      editing: {
        id: g.id,
        nombre: g.nombre,
        alumnosIds: g.alumnosIds,
        fechaEntrega: g.fechaEntrega,
        comentarios: g.comentarios,
        notas: g.notas,
      },
    });
  }

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
              placeholder="Buscar por nombre de grupo..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#FD5249]"
            />
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={() => setModalNuevoProyecto(true)}
          disabled={!ventanaId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Nuevo proyecto
        </button>
      </div>

      {proyectos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Todavía no hay ningún proyecto en esta ventana.
        </div>
      ) : (
        <div className="space-y-3">
          {proyectos.map((p) => {
            const abierto = expandidos.has(p.id);
            const puedeEliminarProyecto = (esDirectivo || p.creadoPorId === currentUserId) && p.grupos.length === 0;
            return (
              <div key={p.id} className="rounded-2xl border border-slate-200 bg-white">
                <button
                  onClick={() => toggleExpandido(p.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#0B1D4D]">{formatearCiclo(p.ciclo)}</span>
                      <span className="text-xs text-slate-400">
                        · {p.grupos.length} grupo{p.grupos.length === 1 ? "" : "s"} · creado por {p.creadoPorNombre}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.tiposNota.map((t) => (
                        <span key={t.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {t.nombre} {t.porcentaje}%
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {puedeEliminarProyecto && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminarProyecto(p);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-slate-100 p-5 pt-4">
                    <div className="mb-3 flex justify-end">
                      <button
                        onClick={() => abrirNuevoGrupo(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-[#FD5249] hover:text-[#FD5249]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Nuevo grupo
                      </button>
                    </div>

                    {p.grupos.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">Todavía no hay ningún grupo en este proyecto.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[680px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs text-slate-400">
                              <th className="px-4 py-2.5 font-medium">Nombre</th>
                              <th className="px-4 py-2.5 font-medium">Alumnos</th>
                              <th className="px-4 py-2.5 font-medium">Entrega</th>
                              <th className="px-4 py-2.5 font-medium">Nota final</th>
                              {esDirectivo && <th className="px-4 py-2.5 font-medium">Creado por</th>}
                              <th className="w-28 px-4 py-2.5" />
                            </tr>
                          </thead>
                          <tbody>
                            {p.grupos.map((g) => (
                              <tr key={g.id} className="border-b border-slate-50 last:border-0">
                                <td className="px-4 py-2.5 font-medium text-slate-700">{g.nombre}</td>
                                <td className="px-4 py-2.5 text-slate-500">{g.alumnosNombres.length}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  {new Date(g.fechaEntrega).toLocaleDateString("es-ES")}
                                </td>
                                <td className="px-4 py-2.5">
                                  {g.notaFinal !== null ? (
                                    <span className="font-semibold text-[#0B1D4D]">{g.notaFinal}</span>
                                  ) : (
                                    <span className="text-xs text-amber-600">Pendiente</span>
                                  )}
                                </td>
                                {esDirectivo && <td className="px-4 py-2.5 text-xs text-slate-500">{g.creadoPorNombre}</td>}
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setDetalle({ grupo: g, tiposNota: p.tiposNota })}
                                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    {(esDirectivo || g.creadoPorId === currentUserId) && (
                                      <>
                                        <button
                                          onClick={() => abrirEditarGrupo(p, g)}
                                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleEliminarGrupo(g)}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalNuevoProyecto && (
        <ProyectoFormModal ventanaId={ventanaId} ciclosCentro={ciclosCentro} schoolId={schoolId} onClose={() => setModalNuevoProyecto(false)} />
      )}

      {grupoModal && (
        <ProyectoGrupoFormModal
          proyectoId={grupoModal.proyecto.id}
          ciclo={grupoModal.proyecto.ciclo}
          tiposNota={grupoModal.proyecto.tiposNota}
          schoolId={schoolId}
          editing={grupoModal.editing}
          onClose={() => setGrupoModal(null)}
        />
      )}

      {detalle && <ProyectoGrupoDetalleModal grupo={detalle.grupo} tiposNota={detalle.tiposNota} onClose={() => setDetalle(null)} />}
    </div>
  );
}
