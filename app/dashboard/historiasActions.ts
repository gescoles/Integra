"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin, HISTORIAS_BUCKET } from "@/lib/supabaseAdmin";

const DURACION_HISTORIA_HORAS = 24;

export async function crearHistoria(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const file = formData.get("imagen") as File | null;
  const texto = (formData.get("texto") as string)?.trim();
  const ciclo = (formData.get("ciclo") as string)?.trim();

  if (!file || file.size === 0) throw new Error("Elige una foto o un vídeo para la historia.");
  const esVideo = file.type.startsWith("video/");
  const esImagen = file.type.startsWith("image/");
  if (!esVideo && !esImagen) throw new Error("El archivo debe ser una imagen o un vídeo.");
  if (!texto) throw new Error("Escribe una descripción para la historia.");
  if (!ciclo) throw new Error("Elige de qué ciclo es la historia.");

  const limiteBytes = esVideo ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > limiteBytes) {
    throw new Error(esVideo ? "El vídeo no puede pesar más de 30 MB." : "La imagen no puede pesar más de 8 MB.");
  }

  const ext = file.name.split(".").pop() || (esVideo ? "mp4" : "jpg");
  const filename = `${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Se guarda en Supabase Storage, que es lo que se usa para mostrar la
  // historia dentro de la app (fiable y rápido de servir).
  // Supabase no acepta según qué caracteres en la ruta del archivo (tildes,
  // la ç, espacios...), así que lo convertimos a un formato seguro antes
  // de guardarlo. El nombre "bonito" tal cual lo escribió el profesor se
  // queda igual en la base de datos (campo "ciclo"); esto es solo para la
  // ruta del archivo en el storage.
  const cicloCarpeta =
    ciclo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita los acentos (é -> e, etc.)
      .replace(/ç/gi, "c")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "General";
  const path = `${session.user.schoolId}/Historias/${cicloCarpeta}/${filename}`;

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from(HISTORIAS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadError) throw new Error(`No se pudo subir el archivo: ${uploadError.message}`);

  const { data } = supabase.storage.from(HISTORIAS_BUCKET).getPublicUrl(path);
  const imagenUrl = data.publicUrl;

  const expiraEn = new Date(Date.now() + DURACION_HISTORIA_HORAS * 60 * 60 * 1000);

  await prisma.historia.create({
    data: {
      schoolId: session.user.schoolId,
      autorId: session.user.id,
      tipo: esVideo ? "VIDEO" : "IMAGEN",
      imagenUrl,
      texto,
      ciclo,
      expiraEn,
    },
  });

  // Además, se guarda una copia en Google Drive siguiendo la ruta
  // Escuela / Historias / Ciclo / Imagen (mejor esfuerzo: si Drive falla,
  // la historia ya se ha publicado igualmente gracias a Supabase).
  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
    if (rootFolderId) {
      const school = await prisma.school.findUnique({ where: { id: session.user.schoolId }, select: { name: true } });
      if (school) {
        const { ensureSubfolder, uploadGenericFileToDrive } = await import("@/lib/googleDrive");
        const { safeFileName } = await import("@/lib/exportWorkbooks");

        const schoolFolderId = await ensureSubfolder(rootFolderId, safeFileName(school.name));
        const historiasFolderId = await ensureSubfolder(schoolFolderId, "Historias");
        const cicloFolderId = await ensureSubfolder(historiasFolderId, safeFileName(ciclo));
        await uploadGenericFileToDrive(cicloFolderId, filename, Buffer.from(bytes), file.type, texto);
      }
    }
  } catch {
    // No pasa nada si falla la copia en Drive; la historia ya está
    // publicada y visible gracias a Supabase.
  }

  revalidatePath("/dashboard");
}

// Ciclos/cursos del centro para el desplegable al subir una historia. Se
// reutilizan los cursos ya existentes de Alumnos; si el centro todavía no
// tiene ninguno, se ofrece una lista genérica de partida.
// Ciclos reales de iMES Maresme, con el curso (1/2) de cada uno para que se
// pueda elegir el año exacto. Solo se usan cuando el centro es iMES; el
// resto de centros siguen con sus propios cursos de Alumnos.
const CICLOS_IMES = [
  "Art i Disseny 1", "Art i Disseny 2",
  "Arts Escèniques 1", "Arts Escèniques 2",
  "Audiovisuals 1", "Audiovisuals 2",
  "Producció Musical 1", "Producció Musical 2",
  "Batxillerat Humanístic 1", "Batxillerat Humanístic 2",
  "Batxillerat Social 1", "Batxillerat Social 2",
  "Activitats Comercials 1", "Activitats Comercials 2",
  "Publicitat i Màrqueting 1", "Publicitat i Màrqueting 2",
  "Comerç Internacional 1", "Comerç Internacional 2",
  "SIMIX 1", "SIMIX 2",
  "ASIX 1", "ASIX 2",
  "DAM 1", "DAM 2",
  "Administració i Finances 1", "Administració i Finances 2",
  "Cures Auxiliars d'Infermeria",
  "Dietètica 1", "Dietètica 2",
  "Educació Infantil 1", "Educació Infantil 2",
  "Integració Social 1", "Integració Social 2",
];

export async function obtenerCiclosDelCentro() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) return [];

  const school = await prisma.school.findUnique({ where: { id: session.user.schoolId }, select: { name: true } });
  if (school?.name?.toLowerCase().includes("imes")) return CICLOS_IMES;

  const alumnos = await prisma.alumno.findMany({
    where: { schoolId: session.user.schoolId },
    select: { curso: true },
    distinct: ["curso"],
    orderBy: { curso: "asc" },
  });

  const cursos = alumnos.map((a) => a.curso).filter(Boolean);
  if (cursos.length > 0) return cursos;

  return ["1r curs", "2n curs", "General"];
}

export async function obtenerHistoriasActivas() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];

  const historiasRaw = await prisma.historia.findMany({
    where: { expiraEn: { gt: new Date() } },
    include: {
      school: { select: { id: true, name: true, logoUrl: true } },
      autor: { select: { name: true, email: true } },
      vistas: { where: { userId: session.user.id }, select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Las agrupamos por centro, como los "círculos" de Instagram: un círculo
  // por centro, con todas sus historias activas dentro.
  const porCentro = new Map<
    string,
    {
      schoolId: string;
      schoolName: string;
      schoolLogoUrl: string | null;
      historias: {
        id: string;
        tipo: string;
        imagenUrl: string;
        texto: string | null;
        ciclo: string | null;
        autorId: string;
        autorNombre: string;
        createdAt: string;
        vistaPorMi: boolean;
      }[];
    }
  >();

  for (const h of historiasRaw) {
    if (!porCentro.has(h.schoolId)) {
      porCentro.set(h.schoolId, {
        schoolId: h.schoolId,
        schoolName: h.school.name,
        schoolLogoUrl: h.school.logoUrl,
        historias: [],
      });
    }
    porCentro.get(h.schoolId)!.historias.push({
      id: h.id,
      tipo: h.tipo,
      imagenUrl: h.imagenUrl,
      texto: h.texto,
      ciclo: h.ciclo,
      autorId: h.autorId,
      autorNombre: h.autor.name ?? h.autor.email,
      createdAt: h.createdAt.toISOString(),
      vistaPorMi: h.vistas.length > 0,
    });
  }

  // El propio centro del usuario aparece primero, como en Instagram.
  const grupos = Array.from(porCentro.values());
  grupos.sort((a, b) => {
    if (a.schoolId === session.user.schoolId) return -1;
    if (b.schoolId === session.user.schoolId) return 1;
    return 0;
  });

  return grupos;
}

export async function marcarHistoriaVista(historiaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return;

  await prisma.historiaVista.upsert({
    where: { historiaId_userId: { historiaId, userId: session.user.id } },
    create: { historiaId, userId: session.user.id },
    update: {},
  });
}

export async function obtenerEspectadores(historiaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { ok: false as const };

  const historia = await prisma.historia.findUnique({ where: { id: historiaId } });
  if (!historia) return { ok: false as const };

  const role = session.user.role;
  const puedeVer =
    role === "SUPERADMIN" ||
    ((role === "COORDINADOR" || role === "ADMIN_CENTRO") && historia.schoolId === session.user.schoolId) ||
    historia.autorId === session.user.id;
  if (!puedeVer) return { ok: false as const };

  const vistas = await prisma.historiaVista.findMany({
    where: { historiaId },
    include: { user: { select: { name: true, email: true, avatarUrl: true } } },
    orderBy: { vistoEn: "desc" },
  });

  return {
    ok: true as const,
    espectadores: vistas.map((v) => ({
      nombre: v.user.name ?? v.user.email,
      avatarUrl: v.user.avatarUrl,
      vistoEn: v.vistoEn.toISOString(),
    })),
  };
}

export async function eliminarHistoria(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const historia = await prisma.historia.findUnique({ where: { id } });
  if (!historia) throw new Error("No se ha encontrado la historia.");

  const role = session.user.role;
  const puedeEliminar =
    role === "SUPERADMIN" ||
    ((role === "COORDINADOR" || role === "ADMIN_CENTRO") && historia.schoolId === session.user.schoolId) ||
    historia.autorId === session.user.id;
  if (!puedeEliminar) throw new Error("No puedes eliminar esta historia.");

  await prisma.historia.delete({ where: { id } });
  revalidatePath("/dashboard");
}
