import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { obtenerNoticiaPublicaPorSlug } from "@/lib/noticiasPublic";
import { NoticiaIframe } from "./NoticiaIframe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const noticia = await obtenerNoticiaPublicaPorSlug(params.slug);
  if (!noticia) return { title: "Noticia no encontrada — Docentium" };
  return {
    title: `${noticia.titulo} — Docentium`,
    description: noticia.resumen,
  };
}

export default async function NoticiaDetallePage({ params }: { params: { slug: string } }) {
  const noticia = await obtenerNoticiaPublicaPorSlug(params.slug);
  if (!noticia) notFound();

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <SiteHeader />

      <article className="mx-auto max-w-3xl px-6 pb-24 pt-6">
        <Link href="/noticias" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FD5249]">
          <ArrowLeft className="h-4 w-4" /> Volver a noticias
        </Link>

        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#FD5249]">
            {noticia.categoria === "CENTRO" ? noticia.escuela : noticia.fuenteNombre ?? "Educación en España"}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3" /> {formatFecha(noticia.publishedAt)}
          </span>
        </div>

        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-[#0B1D4D] sm:text-4xl">
          {noticia.titulo}
        </h1>

        <p className="mb-6 text-lg text-slate-500">{noticia.resumen}</p>

        {noticia.imagenPortada && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={noticia.imagenPortada}
            alt={noticia.titulo}
            className="mb-8 h-auto w-full rounded-3xl object-cover shadow-lg"
          />
        )}

        {noticia.modo === "PERSONALIZADO" ? (
          <NoticiaIframe html={noticia.cuerpoHtml} css={noticia.cssPersonalizado} />
        ) : (
          <div className="noticia-contenido" dangerouslySetInnerHTML={{ __html: noticia.cuerpoHtml }} />
        )}

        {noticia.categoria === "EDUCACION_ESPANA" && noticia.fuenteUrl && (
          <a
            href={noticia.fuenteUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-8 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]"
          >
            Leer la noticia completa en {noticia.fuenteNombre ?? "la fuente original"} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
