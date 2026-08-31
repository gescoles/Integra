"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Pencil } from "lucide-react";
import { crearCertificacion, actualizarCertificacion, obtenerCatalogoPorCategoria, obtenerCertificacion, obtenerCategoriasPorDepartamento } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";

type CertificacionExistente = Awaited<ReturnType<typeof obtenerCertificacion>>;

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]";

// 10 cursos académicos, empezando en 2026-2027 hacia arriba.
const CURSOS_ACADEMICOS = Array.from({ length: 10 }, (_, i) => `${2026 + i}-${2027 + i}`);

export function CrearCertificacionModal({
  categorias,
  departamentos,
  cursoAcademicoCentro,
  gruposCentro,
  certificacionId,
  categoriaInicial,
  nombreInicial,
  trigger,
}: {
  categorias: string[];
  departamentos: { id: string; nombre: string }[];
  cursoAcademicoCentro: string | null;
  gruposCentro: string[];
  certificacionId?: string;
  categoriaInicial?: string;
  nombreInicial?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<CertificacionExistente>(null);
  const [departamento, setDepartamento] = useState("");
  const [categoriasDelDepartamento, setCategoriasDelDepartamento] = useState<string[]>([]);
  const [categoria, setCategoria] = useState("");
  const [nombresCatalogo, setNombresCatalogo] = useState<{ id: string; nombre: string; horasDefault: number | null; sedeExamenDefault: string | null }[]>([]);
  const [nombreElegido, setNombreElegido] = useState("");
  const [horas, setHoras] = useState("");
  const [sedeExamen, setSedeExamen] = useState("");
  const [cursoAcademico, setCursoAcademico] = useState("");
  const [cursoManual, setCursoManual] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esEdicion = Boolean(certificacionId);
  const requiereDepartamento = !esEdicion && !categoriaInicial && departamentos.length > 0;

  useEffect(() => {
    if (esEdicion || !departamento) {
      setCategoriasDelDepartamento([]);
      return;
    }
    obtenerCategoriasPorDepartamento(departamento).then((lista) => {
      setCategoriasDelDepartamento(lista);
      if (categoria && !lista.includes(categoria)) {
        setCategoria("");
      }
    });
  }, [departamento]);

  useEffect(() => {
    if (!categoria) {
      setNombresCatalogo([]);
      return;
    }
    obtenerCatalogoPorCategoria(categoria, departamento || undefined).then((lista) => {
      setNombresCatalogo(lista);
      // Al cambiar de categoría con datos ya cargados (edición o
      // pre-relleno), si el nombre elegido sigue existiendo en la nueva
      // lista, lo mantenemos; si no, lo dejamos en blanco.
      if (nombreElegido && !lista.some((n) => n.nombre === nombreElegido)) {
        setNombreElegido("");
        setHoras("");
      }
    });
  }, [categoria]);

  function handleElegirNombre(nombre: string) {
    setNombreElegido(nombre);
    const entrada = nombresCatalogo.find((n) => n.nombre === nombre);
    if (entrada?.horasDefault != null) setHoras(String(entrada.horasDefault));
    // Se rellena sola desde el catálogo, pero se puede editar y no es
    // obligatoria — si el curso no trae sede por defecto, se deja vacía.
    setSedeExamen(entrada?.sedeExamenDefault ?? "");
  }

  async function handleAbrir() {
    setOpen(true);
    setError(null);
    if (certificacionId) {
      setCargando(true);
      try {
        const c = await obtenerCertificacion(certificacionId);
        setDatos(c);
        setCategoria(c?.categoria ?? "");
        setNombreElegido(c?.nombreCertificacion ?? "");
        setHoras(c?.horas != null ? String(c.horas) : "");
        setSedeExamen(c?.sedeExamen ?? "");
        const cursoExistente = c?.cursoAcademico ?? "";
        setCursoAcademico(cursoExistente);
        setCursoManual(cursoExistente !== "" && !CURSOS_ACADEMICOS.includes(cursoExistente));
      } finally {
        setCargando(false);
      }
    } else {
      setDatos(null);
      setDepartamento("");
      setCategoria(categoriaInicial ?? "");
      setNombreElegido(nombreInicial ?? "");
      setHoras("");
      setSedeExamen("");
      const cursoPorDefecto = cursoAcademicoCentro && CURSOS_ACADEMICOS.includes(cursoAcademicoCentro) ? cursoAcademicoCentro : CURSOS_ACADEMICOS[0];
      setCursoAcademico(cursoPorDefecto);
      setCursoManual(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      if (certificacionId) {
        await actualizarCertificacion(certificacionId, formData);
      } else {
        await crearCertificacion(formData);
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div onClick={handleAbrir} className="contents">
        {trigger ?? (
          <button className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]">
            <Plus className="h-4 w-4" /> Programar Certificación
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-6" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{esEdicion ? "Editar certificación" : "Programar Certificación"}</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cargando ? (
              <div className="py-16 text-center text-sm text-slate-400">Cargando...</div>
            ) : (
              <form action={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

                {requiereDepartamento && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Departamento <span className="text-red-500">*</span>
                    </label>
                    <select value={departamento} onChange={(e) => setDepartamento(e.target.value)} className={inputClass}>
                      <option value="">Selecciona...</option>
                      {departamentos.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="categoria"
                    required
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    disabled={requiereDepartamento && !departamento}
                    className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                  >
                    <option value="">{requiereDepartamento && !departamento ? "Elige primero un departamento..." : "Selecciona..."}</option>
                    {(requiereDepartamento ? categoriasDelDepartamento : categorias).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Curso <span className="text-red-500">*</span>
                    </label>
                    {!cursoManual ? (
                      <select
                        name="cursoAcademico"
                        required
                        value={cursoAcademico}
                        onChange={(e) => {
                          if (e.target.value === "__manual__") {
                            setCursoManual(true);
                            setCursoAcademico("");
                          } else {
                            setCursoAcademico(e.target.value);
                          }
                        }}
                        className={inputClass}
                      >
                        {CURSOS_ACADEMICOS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="__manual__">Otro (escribir a mano)...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          name="cursoAcademico"
                          required
                          value={cursoAcademico}
                          onChange={(e) => setCursoAcademico(e.target.value)}
                          placeholder="Ej. 2025-2026"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCursoManual(false);
                            setCursoAcademico(CURSOS_ACADEMICOS[0]);
                          }}
                          className="shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                        >
                          Lista
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Grupo del ciclo <span className="text-red-500">*</span>
                    </label>
                    <select name="cicloFormativo" required defaultValue={datos?.cicloFormativo ?? ""} className={inputClass} disabled={gruposCentro.length === 0}>
                      <option value="" disabled>
                        Selecciona...
                      </option>
                      {gruposCentro.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Fecha de inicio de preparación <span className="text-red-500">*</span>
                    </label>
                    <input name="fechaInicioPreparacion" type="date" required defaultValue={datos?.fechaInicioPreparacion ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Fecha de fin de preparación <span className="text-red-500">*</span>
                    </label>
                    <input name="fechaFinPreparacion" type="date" required defaultValue={datos?.fechaFinPreparacion ?? ""} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha del examen (opcional)</label>
                  <input name="fechaExamen" type="date" defaultValue={datos?.fechaExamen ?? ""} className={inputClass} />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Certificación</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Nombre de la certificación <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="nombreCertificacion"
                        required
                        value={nombreElegido}
                        onChange={(e) => handleElegirNombre(e.target.value)}
                        disabled={!categoria}
                        className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                      >
                        <option value="">{!categoria ? "Elige primero una categoría..." : "Selecciona..."}</option>
                        {nombresCatalogo.map((n) => (
                          <option key={n.id} value={n.nombre}>{n.nombre}</option>
                        ))}
                        {nombreElegido && !nombresCatalogo.some((n) => n.nombre === nombreElegido) && (
                          <option value={nombreElegido}>{nombreElegido}</option>
                        )}
                      </select>
                      {categoria && nombresCatalogo.length === 0 && (
                        <p className="mt-1 text-[11px] text-slate-400">Todavía no hay certificaciones cargadas para esta categoría.</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Horas <span className="text-red-500">*</span>
                      </label>
                      <input name="horas" type="number" min={0} required value={horas} onChange={(e) => setHoras(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Duración del examen</label>
                      <input name="duracionExamen" placeholder="Ej. 3 horas y 30 minutos" defaultValue={datos?.duracionExamen ?? ""} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Modalidad <span className="text-red-500">*</span>
                      </label>
                      <select name="modalidad" required defaultValue={datos?.modalidad ?? ""} className={inputClass}>
                        <option value="" disabled>Selecciona...</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Online">Online</option>
                        <option value="Escrita y oral">Escrita y oral</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sede del examen</label>
                      <input name="sedeExamen" value={sedeExamen} onChange={(e) => setSedeExamen(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Estado <span className="text-red-500">*</span>
                      </label>
                      <select name="estado" required defaultValue={datos?.estado ?? "PROGRAMADA"} className={inputClass}>
                        <option value="PROGRAMADA">Programada</option>
                        <option value="EN_CURSO">En curso</option>
                        <option value="ACTIVA">Activa</option>
                        <option value="ACABADA">Acabada</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notas / Observaciones</label>
                    <textarea name="notas" rows={2} defaultValue={datos?.notas ?? ""} className={inputClass} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={pending} className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60">
                    {pending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Programar certificación"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
