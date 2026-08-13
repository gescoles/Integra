"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin, NOTICIAS_BUCKET } from "@/lib/supabaseAdmin";

async function exigirSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") throw new Error("No autorizado.");
  return session;
}

// Convierte el título en un slug único para la URL pública
// (/noticias/mi-titulo-de-noticia-a1b2c3).
function generarSlug(titulo: string) {
  const base = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const sufijo = Math.random().toString(36).slice(2, 8);
  return `${base || "noticia"}-${sufijo}`;
}

// El modo "simple" se escribe como texto plano (un párrafo por línea en
// blanco) y aquí se convierte a HTML sencillo para guardarlo ya listo.
function textoATexto(texto: string) {
  return texto
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean)
    .map((parrafo) => `<p>${parrafo.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

async function subirImagenPortada(file: File | null, slug: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("La portada debe ser una imagen (JPG, PNG, WEBP...).");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen no puede pesar más de 5 MB.");
  }

  const supabase = getSupabaseAdmin();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${slug}/portada-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage.from(NOTICIAS_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

  return supabase.storage.from(NOTICIAS_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function leerContenido(formData: FormData) {
  const modo: "SIMPLE" | "PERSONALIZADO" =
    (formData.get("modo") as string) === "PERSONALIZADO" ? "PERSONALIZADO" : "SIMPLE";

  if (modo === "SIMPLE") {
    const texto = ((formData.get("cuerpoTexto") as string) || "").trim();
    if (!texto) throw new Error("Escribe el contenido de la noticia.");
    return { modo, cuerpoHtml: textoATexto(texto), cssPersonalizado: null as string | null };
  }

  const htmlFile = formData.get("archivoHtml") as File | null;
  if (!htmlFile || htmlFile.size === 0) throw new Error("Sube el archivo index.html.");
  if (htmlFile.size > 2 * 1024 * 1024) throw new Error("El HTML no puede pesar más de 2 MB.");
  const cuerpoHtml = await htmlFile.text();

  const cssFile = formData.get("archivoCss") as File | null;
  let cssPersonalizado: string | null = null;
  if (cssFile && cssFile.size > 0) {
    if (cssFile.size > 1 * 1024 * 1024) throw new Error("El CSS no puede pesar más de 1 MB.");
    cssPersonalizado = await cssFile.text();
  }

  return { modo, cuerpoHtml, cssPersonalizado };
}

function leerCategoriaYCentro(formData: FormData) {
  const categoria: "CENTRO" | "EDUCACION_ESPANA" =
    (formData.get("categoria") as string) === "EDUCACION_ESPANA" ? "EDUCACION_ESPANA" : "CENTRO";

  if (categoria === "CENTRO") {
    const schoolId = formData.get("schoolId") as string;
    if (!schoolId) throw new Error("Selecciona un centro.");
    return { categoria, schoolId, fuenteNombre: null as string | null, fuenteUrl: null as string | null };
  }

  const fuenteNombre = ((formData.get("fuenteNombre") as string) || "").trim() || null;
  const fuenteUrl = ((formData.get("fuenteUrl") as string) || "").trim() || null;
  return { categoria, schoolId: null as string | null, fuenteNombre, fuenteUrl };
}

export async function crearNoticia(formData: FormData, publicar: boolean) {
  const session = await exigirSuperAdmin();

  const titulo = ((formData.get("titulo") as string) || "").trim();
  const resumen = ((formData.get("resumen") as string) || "").trim();
  if (!titulo) throw new Error("El título es obligatorio.");
  if (!resumen) throw new Error("El resumen es obligatorio.");

  const { categoria, schoolId, fuenteNombre, fuenteUrl } = leerCategoriaYCentro(formData);
  const { modo, cuerpoHtml, cssPersonalizado } = await leerContenido(formData);
  const slug = generarSlug(titulo);
  const imagenPortada = await subirImagenPortada(formData.get("imagen") as File | null, slug);

  await prisma.noticia.create({
    data: {
      categoria,
      schoolId,
      autorId: session.user.id,
      slug,
      titulo,
      resumen,
      imagenPortada,
      modo,
      cuerpoHtml,
      cssPersonalizado,
      fuenteNombre,
      fuenteUrl,
      publicada: publicar,
      publishedAt: publicar ? new Date() : null,
    },
  });

  revalidatePath("/dashboard/noticias-admin");
  revalidatePath("/noticias");
}

export async function actualizarNoticia(id: string, formData: FormData) {
  await exigirSuperAdmin();

  const titulo = ((formData.get("titulo") as string) || "").trim();
  const resumen = ((formData.get("resumen") as string) || "").trim();
  if (!titulo) throw new Error("El título es obligatorio.");
  if (!resumen) throw new Error("El resumen es obligatorio.");

  const { categoria, schoolId, fuenteNombre, fuenteUrl } = leerCategoriaYCentro(formData);
  const { modo, cuerpoHtml, cssPersonalizado } = await leerContenido(formData);

  const actual = await prisma.noticia.findUnique({ where: { id } });
  if (!actual) throw new Error("No se ha encontrado la noticia.");

  const nuevaImagen = await subirImagenPortada(formData.get("imagen") as File | null, actual.slug);

  await prisma.noticia.update({
    where: { id },
    data: {
      categoria,
      schoolId,
      titulo,
      resumen,
      modo,
      cuerpoHtml,
      cssPersonalizado,
      fuenteNombre,
      fuenteUrl,
      ...(nuevaImagen ? { imagenPortada: nuevaImagen } : {}),
    },
  });

  revalidatePath("/dashboard/noticias-admin");
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${actual.slug}`);
}

export async function cambiarPublicacion(id: string, publicada: boolean) {
  await exigirSuperAdmin();

  const noticia = await prisma.noticia.update({
    where: { id },
    data: {
      publicada,
      publishedAt: publicada ? new Date() : null,
    },
  });

  revalidatePath("/dashboard/noticias-admin");
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${noticia.slug}`);
}

export async function eliminarNoticia(id: string) {
  await exigirSuperAdmin();

  const noticia = await prisma.noticia.delete({ where: { id } });

  revalidatePath("/dashboard/noticias-admin");
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${noticia.slug}`);
}

export async function obtenerNoticiasAdmin() {
  await exigirSuperAdmin();

  const noticias = await prisma.noticia.findMany({
    include: { school: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return noticias.map((n) => ({
    id: n.id,
    slug: n.slug,
    titulo: n.titulo,
    resumen: n.resumen,
    imagenPortada: n.imagenPortada,
    categoria: n.categoria,
    escuela: n.school?.name ?? null,
    publicada: n.publicada,
    publishedAt: n.publishedAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function obtenerNoticiaParaEditar(id: string) {
  await exigirSuperAdmin();

  const n = await prisma.noticia.findUnique({ where: { id } });
  if (!n) throw new Error("No se ha encontrado la noticia.");

  return {
    id: n.id,
    categoria: n.categoria,
    schoolId: n.schoolId,
    titulo: n.titulo,
    resumen: n.resumen,
    imagenPortada: n.imagenPortada,
    modo: n.modo,
    cuerpoTexto: n.modo === "SIMPLE" ? n.cuerpoHtml.replace(/<br \/>/g, "\n").replace(/<\/?p>/g, "\n").trim() : "",
    fuenteNombre: n.fuenteNombre,
    fuenteUrl: n.fuenteUrl,
  };
}

export async function obtenerCentrosParaSelector() {
  await exigirSuperAdmin();

  const centros = await prisma.school.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return centros;
}
