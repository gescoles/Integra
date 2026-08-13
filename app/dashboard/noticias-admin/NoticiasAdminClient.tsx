"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { cambiarPublicacion, eliminarNoticia } from "./actions";
import { NoticiaFormModal } from "./NoticiaFormModal";

type Noticia = {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  imagenPortada: string | null;
  categoria: "CENTRO" | "EDUCACION_ESPANA";
  escuela: string | null;
  publicada: boolean;
  publishedAt: string | null;
  createdAt: string;
};
type Centro = { id: string; name: string };

export function NoticiasAdminClient({ noticias, centros }: { noticias: Noticia[]; centros: Centro[] }) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState<"nueva" | string | null>(null);
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState<Noticia | null>(null);

  async function handleTogglePublicar(n: Noticia) {
    setCambiandoId(n.id);
    try {
      await cambiarPublicacion(n.id, !n.publicada);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    } finally {
      setCambiandoId(null);
    }
  }

  async function handleEliminar(n: Noticia) {
    setBorrando(n.id);
    try {
      await eliminarNoticia(n.id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBorrando(null);
      setConfirmarBorrar(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/noticias" target="_blank" className="inline-flex items-center gap-1 font-semibold text-[#FD5249] hover:underline">
            Ver web de noticias <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
        <button
          onClick={() => setModalAbierto("nueva")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#D7463E]"
        >
          <Plus className="h-4 w-4" /> Nueva noticia
        </button>
      </div>

      {noticias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-sm text-slate-400">
          Todavía no has publicado ninguna noticia.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {noticias.map((n) => (
            <div key={n.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-32 w-full bg-slate-100">
                {n.imagenPortada ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.imagenPortada} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-300">Sin imagen</div>
                )}
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    n.publicada ? "bg-emerald-500 text-white" : "bg-slate-700/80 text-white"
                  }`}
                >
                  {n.publicada ? "Publicada" : "Borrador"}
                </span>
              </div>
              <div className="p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#FD5249]">
                  {n.categoria === "CENTRO" ? n.escuela : "Educación en España"}
                </p>
                <h3 className="mb-1 line-clamp-2 text-sm font-bold text-[#0B1D4D]">{n.titulo}</h3>
                <p className="mb-3 line-clamp-2 text-xs text-slate-500">{n.resumen}</p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModalAbierto(n.id)}
                      title="Editar"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmarBorrar(n)}
                      title="Eliminar"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {n.publicada && (
                      <Link
                        href={`/noticias/${n.slug}`}
                        target="_blank"
                        title="Ver noticia publicada"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => handleTogglePublicar(n)}
                    disabled={cambiandoId === n.id}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                      n.publicada ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    }`}
                  >
                    {n.publicada ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {n.publicada ? "Despublicar" : "Publicar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <NoticiaFormModal
          centros={centros}
          noticiaId={modalAbierto === "nueva" ? undefined : modalAbierto}
          onClose={() => setModalAbierto(null)}
        />
      )}

      {confirmarBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#0B1D4D]">¿Eliminar esta noticia?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Se borrará <strong className="text-slate-700">{confirmarBorrar.titulo}</strong> de forma permanente,
              también de la web pública si estaba publicada.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmarBorrar(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmarBorrar)}
                disabled={borrando === confirmarBorrar.id}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {borrando === confirmarBorrar.id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
