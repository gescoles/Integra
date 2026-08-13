"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, FileCode2, Type, Building2, Globe } from "lucide-react";
import { crearNoticia, actualizarNoticia, obtenerNoticiaParaEditar } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";

type Centro = { id: string; name: string };

export function NoticiaFormModal({
  centros,
  noticiaId,
  onClose,
}: {
  centros: Centro[];
  noticiaId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const esEdicion = Boolean(noticiaId);

  const [categoria, setCategoria] = useState<"CENTRO" | "EDUCACION_ESPANA">("CENTRO");
  const [modo, setModo] = useState<"SIMPLE" | "PERSONALIZADO">("SIMPLE");
  const [cargando, setCargando] = useState(esEdicion);
  const [pending, setPending] = useState<"borrador" | "publicar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [datosIniciales, setDatosIniciales] = useState<{
    schoolId: string | null;
    titulo: string;
    resumen: string;
    imagenPortada: string | null;
    cuerpoTexto: string;
    fuenteNombre: string | null;
    fuenteUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!noticiaId) return;
    obtenerNoticiaParaEditar(noticiaId)
      .then((d) => {
        setDatosIniciales(d);
        setModo(d.modo as "SIMPLE" | "PERSONALIZADO");
        setCategoria(d.categoria as "CENTRO" | "EDUCACION_ESPANA");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar."))
      .finally(() => setCargando(false));
  }, [noticiaId]);

  async function handleSubmit(formData: FormData, publicar: boolean) {
    setPending(publicar ? "publicar" : "borrador");
    setError(null);
    formData.set("modo", modo);
    formData.set("categoria", categoria);
    try {
      if (esEdicion && noticiaId) {
        await actualizarNoticia(noticiaId, formData);
      } else {
        await crearNoticia(formData, publicar);
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{esEdicion ? "Editar noticia" : "Nueva noticia"}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {cargando ? (
          <p className="py-8 text-center text-sm text-slate-400">Cargando...</p>
        ) : (
          <form action={(fd) => handleSubmit(fd, false)} className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tipo de noticia</label>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCategoria("CENTRO")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    categoria === "CENTRO" ? "border-[#FD5249] bg-blue-50 text-[#FD5249]" : "border-slate-200 text-slate-500"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" /> De un centro
                </button>
                <button
                  type="button"
                  onClick={() => setCategoria("EDUCACION_ESPANA")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    categoria === "EDUCACION_ESPANA" ? "border-[#FD5249] bg-blue-50 text-[#FD5249]" : "border-slate-200 text-slate-500"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" /> Educación en España
                </button>
              </div>
            </div>

            {categoria === "CENTRO" ? (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Centro</label>
                <select
                  name="schoolId"
                  required
                  defaultValue={datosIniciales?.schoolId ?? ""}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  <option value="" disabled>
                    Selecciona un centro...
                  </option>
                  {centros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fuente (medio)</label>
                  <input
                    name="fuenteNombre"
                    defaultValue={datosIniciales?.fuenteNombre ?? ""}
                    placeholder="El País, Moncloa.com..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Enlace a la fuente</label>
                  <input
                    name="fuenteUrl"
                    type="url"
                    defaultValue={datosIniciales?.fuenteUrl ?? ""}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Título</label>
              <input
                name="titulo"
                required
                defaultValue={datosIniciales?.titulo}
                placeholder="iMES Maresme estrena nuevo programa de FP dual"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Resumen</label>
              <textarea
                name="resumen"
                required
                rows={2}
                defaultValue={datosIniciales?.resumen}
                placeholder="Una frase corta que se ve en la tarjeta de la lista de noticias."
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Imagen de portada</label>
              {datosIniciales?.imagenPortada && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={datosIniciales.imagenPortada} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />
              )}
              <input
                name="imagen"
                type="file"
                accept="image/*"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
              />
              {esEdicion && <p className="mt-1 text-xs text-slate-400">Déjalo vacío para mantener la imagen actual.</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Contenido</label>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModo("SIMPLE")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    modo === "SIMPLE" ? "border-[#FD5249] bg-blue-50 text-[#FD5249]" : "border-slate-200 text-slate-500"
                  }`}
                >
                  <Type className="h-3.5 w-3.5" /> Escribir texto
                </button>
                <button
                  type="button"
                  onClick={() => setModo("PERSONALIZADO")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    modo === "PERSONALIZADO" ? "border-[#FD5249] bg-blue-50 text-[#FD5249]" : "border-slate-200 text-slate-500"
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5" /> Subir HTML/CSS
                </button>
              </div>

              {modo === "SIMPLE" ? (
                <textarea
                  name="cuerpoTexto"
                  rows={6}
                  defaultValue={datosIniciales?.cuerpoTexto}
                  placeholder={"Escribe el cuerpo de la noticia. Deja una línea en blanco entre párrafos."}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              ) : (
                <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Upload className="h-3.5 w-3.5" /> Archivo index.html {esEdicion ? "(déjalo vacío para no cambiarlo)" : ""}
                    </label>
                    <input name="archivoHtml" type="file" accept=".html,text/html" className="w-full text-xs" />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Upload className="h-3.5 w-3.5" /> Archivo CSS (opcional)
                    </label>
                    <input name="archivoCss" type="file" accept=".css,text/css" className="w-full text-xs" />
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Se muestra dentro de un marco aislado del resto de la web (por seguridad, las etiquetas
                    &lt;script&gt; no se ejecutan). Para animaciones o interactividad, mejor usa solo CSS.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              {esEdicion ? (
                <button
                  type="submit"
                  disabled={pending !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />} Guardar cambios
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={pending !== null}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {pending === "borrador" && <ButtonSpinner />} Guardar borrador
                  </button>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={(e) => {
                      const form = e.currentTarget.closest("form");
                      if (form) handleSubmit(new FormData(form), true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                  >
                    {pending === "publicar" && <ButtonSpinner />} Publicar
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
