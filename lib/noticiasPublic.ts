import { prisma } from "@/lib/prisma";

// Feed único de noticias (mezcla las dos categorías, ordenadas por fecha),
// para la portada de /noticias estilo revista y para el widget que se ve
// en el inicio del panel de todos los usuarios.
export async function obtenerUltimasNoticias(limite?: number) {
  const noticias = await prisma.noticia.findMany({
    where: { publicada: true },
    include: { school: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
    ...(limite ? { take: limite } : {}),
  });

  return noticias.map((n) => ({
    slug: n.slug,
    titulo: n.titulo,
    resumen: n.resumen,
    imagenPortada: n.imagenPortada,
    categoria: n.categoria,
    etiqueta: n.categoria === "CENTRO" ? n.school?.name ?? "Docentium" : n.fuenteNombre ?? "Educación en España",
    publishedAt: n.publishedAt?.toISOString() ?? n.createdAt.toISOString(),
  }));
}

export async function obtenerNoticiasEducacionEspana() {
  const noticias = await prisma.noticia.findMany({
    where: { publicada: true, categoria: "EDUCACION_ESPANA" },
    orderBy: { publishedAt: "desc" },
  });

  return noticias.map((n) => ({
    slug: n.slug,
    titulo: n.titulo,
    resumen: n.resumen,
    imagenPortada: n.imagenPortada,
    fuenteNombre: n.fuenteNombre,
    publishedAt: n.publishedAt?.toISOString() ?? n.createdAt.toISOString(),
  }));
}

export async function obtenerNoticiasDeCentros() {
  const noticias = await prisma.noticia.findMany({
    where: { publicada: true, categoria: "CENTRO" },
    include: { school: { select: { name: true, logoUrl: true } } },
    orderBy: { publishedAt: "desc" },
  });

  return noticias.map((n) => ({
    slug: n.slug,
    titulo: n.titulo,
    resumen: n.resumen,
    imagenPortada: n.imagenPortada,
    escuela: n.school?.name ?? "Docentium",
    escuelaLogo: n.school?.logoUrl ?? null,
    publishedAt: n.publishedAt?.toISOString() ?? n.createdAt.toISOString(),
  }));
}

export async function obtenerNoticiaPublicaPorSlug(slug: string) {
  const n = await prisma.noticia.findUnique({
    where: { slug },
    include: { school: { select: { name: true, logoUrl: true } } },
  });

  if (!n || !n.publicada) return null;

  return {
    titulo: n.titulo,
    resumen: n.resumen,
    imagenPortada: n.imagenPortada,
    categoria: n.categoria,
    escuela: n.school?.name ?? null,
    escuelaLogo: n.school?.logoUrl ?? null,
    fuenteNombre: n.fuenteNombre,
    fuenteUrl: n.fuenteUrl,
    modo: n.modo,
    cuerpoHtml: n.cuerpoHtml,
    cssPersonalizado: n.cssPersonalizado,
    publishedAt: n.publishedAt?.toISOString() ?? n.createdAt.toISOString(),
  };
}
