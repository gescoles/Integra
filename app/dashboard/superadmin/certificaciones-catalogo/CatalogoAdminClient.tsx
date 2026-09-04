"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { crearEntradaCatalogo, actualizarEntradaCatalogo, eliminarEntradaCatalogo, obtenerDepartamentosDeCentro, obtenerCategoriasDelDepartamentoAdmin } from "./actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";

type EntradaCatalogo = {
  id: string;
  categoria: string;
  schoolId: string | null;
  schoolName: string | null;
  departamentoId: string | null;
  departamentoNombre: string | null;
  nombre: string;
  horasDefault: number | null;
  sedeExamenDefault: string | null;
  acercaDe: string | null;
  dirigidoA: string | null;
  objetivos: string | null;
  certificacionInfo: string | null;
  contenidos: string | null;
  proximasConvocatorias: string | null;
};

type Centro = { id: string; name: string };

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]";

export function CatalogoAdminClient({ catalogo, categorias, centros }: { catalogo: EntradaCatalogo[]; categorias: string[]; centros: Centro[] }) {
  const router = useRouter();
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<EntradaCatalogo | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriaCombo, setCategoriaCombo] = useState("");
  const [nuevaCategoriaTexto, setNuevaCategoriaTexto] = useState("");
  const [usandoCategoriaNueva, setUsandoCategoriaNueva] = useState(false);
  const [schoolIdElegido, setSchoolIdElegido] = useState("");
  const [departamentosDelCentro, setDepartamentosDelCentro] = useState<{ id: string; nombre: string }[]>([]);
  const [departamentoIdElegido, setDepartamentoIdElegido] = useState("");
  const [categoriasDelDepartamento, setCategoriasDelDepartamento] = useState<string[]>([]);

  const entradasFiltradas = useMemo(
    () => (categoriaFiltro ? catalogo.filter((c) => c.categoria === categoriaFiltro) : catalogo),
    [catalogo, categoriaFiltro]
  );

  useEffect(() => {
    if (!schoolIdElegido) {
      setDepartamentosDelCentro([]);
      return;
    }
    obtenerDepartamentosDeCentro(schoolIdElegido).then((lista) => {
      setDepartamentosDelCentro(lista);
      if (departamentoIdElegido && !lista.some((d) => d.id === departamentoIdElegido)) {
        setDepartamentoIdElegido("");
      }
    });
  }, [schoolIdElegido]);

  // Cada departamento va acumulando sus propias categorías, distintas de
  // las de otros — al elegir uno, se cargan justo las suyas (más las 16
  // de partida, por si es un departamento nuevo sin ninguna todavía).
  useEffect(() => {
    if (!departamentoIdElegido) {
      setCategoriasDelDepartamento([]);
      return;
    }
    obtenerCategoriasDelDepartamentoAdmin(departamentoIdElegido).then((lista) => {
      setCategoriasDelDepartamento(lista);
      if (!usandoCategoriaNueva && !lista.includes(categoriaCombo)) {
        setCategoriaCombo(lista[0] ?? "");
      }
    });
  }, [departamentoIdElegido]);

  function handleAbrirCrear() {
    setEditando(null);
    setCategoriaCombo("");
    setUsandoCategoriaNueva(false);
    setNuevaCategoriaTexto("");
    setSchoolIdElegido("");
    setDepartamentoIdElegido("");
    setError(null);
    setModalAbierto(true);
  }

  function handleAbrirEditar(entrada: EntradaCatalogo) {
    setEditando(entrada);
    setCategoriaCombo(entrada.categoria);
    setUsandoCategoriaNueva(false);
    setNuevaCategoriaTexto("");
    setSchoolIdElegido(entrada.schoolId ?? "");
    setDepartamentoIdElegido(entrada.departamentoId ?? "");
    setError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("categoria", usandoCategoriaNueva ? nuevaCategoriaTexto.trim() : categoriaCombo);
    formData.set("schoolId", schoolIdElegido);
    formData.set("departamentoId", departamentoIdElegido);
    try {
      if (editando) {
        await actualizarEntradaCatalogo(editando.id, formData);
      } else {
        await crearEntradaCatalogo(formData);
      }
      setModalAbierto(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  async function handleEliminar(id: string) {
    try {
      await eliminarEntradaCatalogo(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoriaFiltro("")}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              !categoriaFiltro ? "border-[#FD5249] bg-red-50 text-[#FD5249]" : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                categoriaFiltro === cat ? "border-[#FD5249] bg-red-50 text-[#FD5249]" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button onClick={handleAbrirCrear} className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D7463E]">
          <Plus className="h-4 w-4" /> Nuevo curso
        </button>
      </div>

      {error && !modalAbierto && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Centro</th>
              <th className="px-4 py-3 font-medium">Departamento</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Horas</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {entradasFiltradas.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 text-slate-500">{e.categoria}</td>
                <td className="px-4 py-3 text-slate-500">{e.schoolName ?? "Todos los centros"}</td>
                <td className="px-4 py-3 text-slate-500">{e.departamentoNombre ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-700">{e.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{e.horasDefault ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleAbrirEditar(e)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleEliminar(e.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entradasFiltradas.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Todavía no hay ningún curso cargado{categoriaFiltro ? " en esta categoría" : ""}.</p>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-6" onClick={() => setModalAbierto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{editando ? "Editar curso" : "Nuevo curso"}</h2>
              <button onClick={() => setModalAbierto(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Centro <span className="text-red-500">*</span>
                  </label>
                  <select value={schoolIdElegido} onChange={(e) => setSchoolIdElegido(e.target.value)} required className={inputClass}>
                    <option value="" disabled>Selecciona...</option>
                    {centros.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Departamento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={departamentoIdElegido}
                    onChange={(e) => setDepartamentoIdElegido(e.target.value)}
                    disabled={!schoolIdElegido}
                    required
                    className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                  >
                    <option value="" disabled>{schoolIdElegido ? "Selecciona..." : "Elige primero un centro..."}</option>
                    {departamentosDelCentro.map((d) => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  {!usandoCategoriaNueva ? (
                    <>
                      <select
                        value={categoriaCombo}
                        onChange={(e) => setCategoriaCombo(e.target.value)}
                        disabled={!departamentoIdElegido}
                        required
                        className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                      >
                        <option value="" disabled>{departamentoIdElegido ? "Selecciona..." : "Elige primero un departamento..."}</option>
                        {categoriasDelDepartamento.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!departamentoIdElegido}
                        onClick={() => setUsandoCategoriaNueva(true)}
                        className="mt-1 text-xs font-semibold text-[#FD5249] hover:underline disabled:text-slate-300"
                      >
                        + Añadir una categoría nueva a este departamento
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        value={nuevaCategoriaTexto}
                        onChange={(e) => setNuevaCategoriaTexto(e.target.value)}
                        placeholder="Nombre de la categoría nueva..."
                        className={inputClass}
                      />
                      <button type="button" onClick={() => setUsandoCategoriaNueva(false)} className="mt-1 text-xs font-semibold text-slate-500 hover:underline">
                        Elegir de la lista en vez de escribir
                      </button>
                    </>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input name="nombre" required defaultValue={editando?.nombre ?? ""} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Horas</label>
                  <input name="horasDefault" type="number" min={0} defaultValue={editando?.horasDefault ?? ""} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sede del examen</label>
                  <input name="sedeExamenDefault" defaultValue={editando?.sedeExamenDefault ?? ""} placeholder="Se rellenará sola al programar, pero se podrá cambiar" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Acerca de este curso</label>
                <textarea name="acercaDe" rows={2} defaultValue={editando?.acercaDe ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Dirigido a</label>
                <textarea name="dirigidoA" rows={2} defaultValue={editando?.dirigidoA ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Objetivos</label>
                <textarea name="objetivos" rows={2} defaultValue={editando?.objetivos ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Certificación (información)</label>
                <textarea name="certificacionInfo" rows={2} defaultValue={editando?.certificacionInfo ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Contenidos</label>
                <textarea name="contenidos" rows={3} defaultValue={editando?.contenidos ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Próximas convocatorias de exámenes</label>
                <textarea name="proximasConvocatorias" rows={2} defaultValue={editando?.proximasConvocatorias ?? ""} className={inputClass} />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={pending} className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60">
                  {pending ? <ButtonSpinner /> : editando ? "Guardar cambios" : "Crear curso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
