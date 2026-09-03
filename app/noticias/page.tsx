import Link from "next/link";
import { Newspaper, Calendar } from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { obtenerUltimasNoticias } from "@/lib/noticiasPublic";
import { NoticiasHeroCarousel } from "./NoticiasHeroCarousel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Noticias — Docentium",
  description: "Educación, ciencia, inteligencia artificial y buenas noticias, además de las novedades de los centros que confían en Docentium.",
};

// Las que aparecen en el carrusel principal (las más recientes de todas,
// mezclando categorías) no se repiten más abajo.
const TAMANO_CARRUSEL = 5;

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

type NoticiaResumen = Awaited<ReturnType<typeof obtenerUltimasNoticias>>[number];

function TarjetaNoticia({ n }: { n: NoticiaResumen }) {
  return (
    <Link
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
  );
}

function SeccionNoticias({ titulo, items }: { titulo: string; items: NoticiaResumen[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <h2 className="mb-5 text-xl font-bold text-[#0B1D4D]">{titulo}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((n) => (
          <TarjetaNoticia key={n.slug} n={n} />
        ))}
      </div>
    </section>
  );
}

export default async function NoticiasPage() {
  const noticias = await obtenerUltimasNoticias();
  const carrusel = noticias.slice(0, TAMANO_CARRUSEL);
  const resto = noticias.slice(TAMANO_CARRUSEL);

  // "Educación" incluye tanto la actualidad general (España/Cataluña)
  // como las noticias propias de cada centro. Ciencia, IA y buenas
  // noticias van cada una en su propia sección.
  const educacion = resto.filter((n) => n.categoria === "EDUCACION_ESPANA" || n.categoria === "CENTRO");
  const ciencia = resto.filter((n) => n.categoria === "CIENCIA");
  const ia = resto.filter((n) => n.categoria === "IA");
  const buenas = resto.filter((n) => n.categoria === "BUENAS_NOTICIAS");

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-6 pt-4">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#FD5249]">
          <Newspaper className="h-3.5 w-3.5" /> Noticias
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[#0B1D4D] sm:text-4xl">Actualidad</h1>
      </section>

      {carrusel.length === 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-24 text-center text-slate-400">
            Todavía no hay noticias publicadas. Vuelve pronto.
          </div>
        </section>
      ) : (
        <>
          <NoticiasHeroCarousel items={carrusel} />

          <div className="pt-12">
            <SeccionNoticias titulo="Educación" items={educacion} />
            <SeccionNoticias titulo="Ciencia" items={ciencia} />
            <SeccionNoticias titulo="Inteligencia artificial" items={ia} />
            <SeccionNoticias titulo="Buenas noticias" items={buenas} />
          </div>
        </>
      )}

      <SiteFooter />
    </div>
  );
}
