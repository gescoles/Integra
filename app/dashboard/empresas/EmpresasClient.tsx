"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ShieldCheck, GraduationCap, Users, Search, Plus, Eye, MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { EmpresaFormModal } from "./EmpresaFormModal";
import { eliminarEmpresa } from "./actions";
import { CIUDADES_CATALUNYA } from "@/lib/catalunyaCiudades";

type EmpresaFila = {
  id: string;
  nombreComercial: string;
  razonSocial: string;
  sector: string | null;
  ciudad: string | null;
  provincia: string | null;
  contactoNombre: string | null;
  contactoEmail: string | null;
  telefono: string | null;
  convenioVigente: boolean;
  convenioInicio: string | null;
  convenioFin: string | null;
  vacantes: number;
  ciclosVinculados: string[];
  estado: string;
  totalConvenios: number;
  updatedAt: string;
};

const POR_PAGINA = 10;

function fechaCorta(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { month: "2-digit", year: "numeric" });
}

export function EmpresasClient({
  empresas,
  puedeEditar,
  schoolId,
}: {
  empresas: EmpresaFila[];
  puedeEditar: boolean;
  schoolId?: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroCiclo, setFiltroCiclo] = useState("");
  const [filtroSector, setFiltroSector] = useState("");
  const [filtroCiudad, setFiltroCiudad] = useState("");
  const [filtroConvenio, setFiltroConvenio] = useState("");
  const [filtroVacantes, setFiltroVacantes] = useState("");
  const [pagina, setPagina] = useState(1);
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [borrarModal, setBorrarModal] = useState<EmpresaFila | null>(null);
  const [textoBorrar, setTextoBorrar] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ciclos = useMemo(() => Array.from(new Set(empresas.flatMap((e) => e.ciclosVinculados))).sort(), [empresas]);
  const sectores = useMemo(() => Array.from(new Set(empresas.map((e) => e.sector).filter(Boolean))).sort() as string[], [empresas]);
  // Igual que en el combobox de crear/editar: las ciudades que ya tienen
  // empresas asignadas salen primero, y luego el resto del catálogo de
  // Catalunya, por si quieres filtrar por una ciudad sin empresas todavía.
  const ciudades = useMemo(() => {
    const conDatos = Array.from(new Set(empresas.map((e) => e.ciudad).filter(Boolean))) as string[];
    const resto = CIUDADES_CATALUNYA.filter((c) => !conDatos.includes(c));
    return [...conDatos.sort(), ...resto];
  }, [empresas]);

  const stats = useMemo(
    () => ({
      activas: empresas.filter((e) => e.estado === "ACTIVO").length,
      conveniosVigentes: empresas.filter((e) => e.convenioVigente).length,
      ciclosVinculados: ciclos.length,
      vacantes: empresas.reduce((sum, e) => sum + e.vacantes, 0),
    }),
    [empresas, ciclos]
  );

  const filtradas = useMemo(() => {
    let lista = empresas;
    const q = busqueda.trim().toLowerCase();
    if (q) lista = lista.filter((e) => e.nombreComercial.toLowerCase().includes(q) || e.razonSocial.toLowerCase().includes(q));
    if (filtroCiclo) lista = lista.filter((e) => e.ciclosVinculados.includes(filtroCiclo));
    if (filtroSector) lista = lista.filter((e) => e.sector === filtroSector);
    if (filtroCiudad) lista = lista.filter((e) => e.ciudad === filtroCiudad);
    if (filtroConvenio === "vigente") lista = lista.filter((e) => e.convenioVigente);
    if (filtroConvenio === "no_vigente") lista = lista.filter((e) => !e.convenioVigente);
    if (filtroVacantes === "con") lista = lista.filter((e) => e.vacantes > 0);
    if (filtroVacantes === "sin") lista = lista.filter((e) => e.vacantes === 0);
    return lista;
  }, [empresas, busqueda, filtroCiclo, filtroSector, filtroCiudad, filtroConvenio, filtroVacantes]);

  // Cada vez que cambia algún filtro, volvemos a la primera página — si
  // no, se podría quedar "atascado" en una página 4 que ya ni existe.
  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroCiclo, filtroSector, filtroCiudad, filtroConvenio, filtroVacantes]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroCiclo("");
    setFiltroSector("");
    setFiltroCiudad("");
    setFiltroConvenio("");
    setFiltroVacantes("");
  }

  async function handleEliminar() {
    if (!borrarModal) return;
    setBorrando(true);
    setError(null);
    try {
      await eliminarEmpresa(borrarModal.id, textoBorrar);
      setBorrarModal(null);
      setTextoBorrar("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBorrando(false);
    }
  }

  const hrefEmpresa = (id: string) => `/dashboard/empresas/${id}${schoolId ? `?school=${schoolId}` : ""}`;

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#0B1D4D]">{stats.activas}</p>
            <p className="text-xs text-slate-500">Empresas activas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#0B1D4D]">{stats.conveniosVigentes}</p>
            <p className="text-xs text-slate-500">Convenios vigentes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#0B1D4D]">{stats.ciclosVinculados}</p>
            <p className="text-xs text-slate-500">Ciclos vinculados</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#FD5249]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#0B1D4D]">{stats.vacantes}</p>
            <p className="text-xs text-slate-500">Vacantes de prácticas</p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar empresa..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>
        <select value={filtroCiclo} onChange={(e) => setFiltroCiclo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#FD5249]">
          <option value="">Ciclo formativo: Todos</option>
          {ciclos.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filtroSector} onChange={(e) => setFiltroSector(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#FD5249]">
          <option value="">Sector: Todos</option>
          {sectores.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#FD5249]">
          <option value="">Ciudad: Todas</option>
          {ciudades.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filtroConvenio} onChange={(e) => setFiltroConvenio(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#FD5249]">
          <option value="">Estado del convenio: Todos</option>
          <option value="vigente">Vigente</option>
          <option value="no_vigente">No vigente</option>
        </select>
        <select value={filtroVacantes} onChange={(e) => setFiltroVacantes(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#FD5249]">
          <option value="">Vacantes: Todas</option>
          <option value="con">Con vacantes</option>
          <option value="sin">Sin vacantes</option>
        </select>
        <button onClick={limpiarFiltros} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">
          Limpiar filtros
        </button>
        {puedeEditar && (
          <EmpresaFormModal
            trigger={
              <button className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#D7463E]">
                <Plus className="h-4 w-4" /> Nueva empresa
              </button>
            }
          />
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Ciclos formativos vinculados</th>
              <th className="px-4 py-3 font-medium">Ubicación</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Convenios</th>
              <th className="px-4 py-3 font-medium">Vacantes</th>
              <th className="px-4 py-3 font-medium">Última actualización</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={hrefEmpresa(e.id)} className="font-semibold text-[#0B1D4D] hover:underline">
                    {e.nombreComercial}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{e.sector ?? "—"}</td>
                <td className="max-w-[220px] px-4 py-3 text-slate-500">{e.ciclosVinculados.join(", ") || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{[e.ciudad, e.provincia].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {e.contactoNombre ?? "—"}
                  {e.contactoEmail && <div className="text-xs text-slate-400">{e.contactoEmail}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${e.totalConvenios > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                    {e.totalConvenios}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{e.vacantes}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fechaCorta(e.updatedAt)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${e.estado === "ACTIVO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {e.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="relative px-4 py-3 text-slate-400">
                  <div className="flex items-center gap-1">
                    <Link href={hrefEmpresa(e.id)} title="Ver ficha" className="rounded p-1.5 hover:bg-slate-100">
                      <Eye className="h-4 w-4" />
                    </Link>
                    {puedeEditar && (
                      <button onClick={() => setMenuAbiertoId(menuAbiertoId === e.id ? null : e.id)} className="rounded p-1.5 hover:bg-slate-100">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {menuAbiertoId === e.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuAbiertoId(null)} />
                      <div className="absolute right-4 top-full z-50 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <EmpresaFormModal
                          empresaId={e.id}
                          trigger={
                            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                          }
                          onAbrir={() => setMenuAbiertoId(null)}
                        />
                        <button
                          onClick={() => {
                            setMenuAbiertoId(null);
                            setBorrarModal(e);
                            setTextoBorrar("");
                            setError(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtradas.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">No hay empresas que coincidan con estos filtros.</p>}

        {filtradas.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              Mostrando {(paginaSegura - 1) * POR_PAGINA + 1}-{Math.min(paginaSegura * POR_PAGINA, filtradas.length)} de {filtradas.length} empresas
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaSegura === 1}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="rounded-lg bg-[#FD5249] px-3 py-1 text-xs font-bold text-white">{paginaSegura}</span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaSegura === totalPaginas}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {borrarModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-6" onClick={() => setBorrarModal(null)}>
          <div onClick={(ev) => ev.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5">
            <h3 className="mb-2 text-base font-bold text-[#0B1D4D]">¿Seguro que quieres eliminar &quot;{borrarModal.nombreComercial}&quot;?</h3>
            <p className="mb-4 text-sm text-slate-500">
              Se eliminarán todos los convenios y documentos relacionados con esta empresa. Esta acción no se puede deshacer.
            </p>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Escribe <span className="font-mono text-[#FD5249]">Eliminar {borrarModal.nombreComercial}</span> para confirmar
            </label>
            <input
              value={textoBorrar}
              onChange={(e) => setTextoBorrar(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400"
            />
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setBorrarModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={borrando || textoBorrar.trim() !== `Eliminar ${borrarModal.nombreComercial}`}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {borrando ? "Eliminando..." : "Eliminar empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
