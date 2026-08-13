import Link from "next/link";
import { Newspaper, Calendar } from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { obtenerUltimasNoticias } from "@/lib/noticiasPublic";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Noticias — Docentium",
  description: "Actualidad educativa en España y novedades de los centros que confían en Docentium.",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function Etiqueta({ texto }: { texto: string }) {
  return <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#0B1D4D]">{texto}</span>;
}

function FechaLinea({ fecha }: { fecha: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <Calendar className="h-3 w-3" /> {formatFecha(fecha)}
    </span>
  );
}

function Imagen({ src, titulo }: { src: string | null; titulo: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
  ) : (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0B1D4D] to-[#1a3a7a]">
      <Newspaper className="h-10 w-10 text-white/30" />
    </div>
  );
}

export default async function NoticiasPage() {
  const noticias = await obtenerUltimasNoticias();
  const [destacada, ...resto] = noticias;
  const secundarias = resto.slice(0, 3);
  const restantes = resto.slice(3);

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-6 pt-4">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#FD5249]">
          <Newspaper className="h-3.5 w-3.5" /> Noticias
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[#0B1D4D] sm:text-4xl">Actualidad educativa</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Lo último de la educación en España y las novedades de los centros que ya usan Docentium.
        </p>
      </section>

      {!destacada ? (
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-24 text-center text-slate-400">
            Todavía no hay noticias publicadas. Vuelve pronto.
          </div>
        </section>
      ) : (
        <>
          {/* Portada: destacada + secundarias */}
          <section className="mx-auto max-w-7xl px-6 pb-10">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Link
                href={`/noticias/${destacada.slug}`}
                className="group relative flex h-[420px] flex-col overflow-hidden rounded-3xl shadow-lg lg:col-span-2"
              >
                <Imagen src={destacada.imagenPortada} titulo={destacada.titulo} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <div className="mb-3 flex items-center gap-2">
                    <Etiqueta texto={destacada.etiqueta} />
                  </div>
                  <h2 className="mb-2 text-2xl font-black leading-tight text-white transition-colors group-hover:text-[#FFB3AE] sm:text-3xl">
                    {destacada.titulo}
                  </h2>
                  <p className="mb-3 line-clamp-2 max-w-2xl text-sm text-white/80">{destacada.resumen}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-white/60">
                    <Calendar className="h-3 w-3" /> {formatFecha(destacada.publishedAt)}
                  </span>
                </div>
              </Link>

              <div className="flex flex-col gap-4">
                {secundarias.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
                    Más noticias pronto
                  </div>
                )}
                {secundarias.map((n) => (
                  <Link
                    key={n.slug}
                    href={`/noticias/${n.slug}`}
                    className="group flex gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl">
                      <Imagen src={n.imagenPortada} titulo={n.titulo} />
                    </div>
                    <div className="flex min-w-0 flex-col justify-center py-0.5">
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#FD5249]">{n.etiqueta}</span>
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#0B1D4D] transition-colors group-hover:text-[#FD5249]">
                        {n.titulo}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Rejilla del resto */}
          {restantes.length > 0 && (
            <section className="mx-auto max-w-7xl px-6 pb-24">
              <h2 className="mb-5 text-xl font-bold text-[#0B1D4D]">Más noticias</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {restantes.map((n) => (
                  <Link
                    key={n.slug}
                    href={`/noticias/${n.slug}`}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-44 w-full overflow-hidden">
                      <Imagen src={n.imagenPortada} titulo={n.titulo} />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <Etiqueta texto={n.etiqueta} />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-2">
                        <FechaLinea fecha={n.publishedAt} />
                      </div>
                      <h3 className="mb-2 text-base font-bold leading-snug text-[#0B1D4D] transition-colors group-hover:text-[#FD5249]">
                        {n.titulo}
                      </h3>
                      <p className="line-clamp-3 flex-1 text-sm text-slate-500">{n.resumen}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <SiteFooter />
    </div>
  );
}
