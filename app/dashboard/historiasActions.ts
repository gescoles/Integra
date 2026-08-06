"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin, HISTORIAS_BUCKET } from "@/lib/supabaseAdmin";

const DURACION_HISTORIA_HORAS = 24;

export async function crearHistoria(formData: FormData) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (role !== "COORDINADOR" && role !== "ADMIN_CENTRO") {
    throw new Error("Solo Coordinación o Dirección del centro pueden publicar historias.");
  }

  const file = formData.get("imagen") as File | null;
  const texto = (formData.get("texto") as string)?.trim();

  if (!file || file.size === 0) throw new Error("Elige una foto o un vídeo para la historia.");
  const esVideo = file.type.startsWith("video/");
  const esImagen = file.type.startsWith("image/");
  if (!esVideo && !esImagen) throw new Error("El archivo debe ser una imagen o un vídeo.");

  const limiteBytes = esVideo ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > limiteBytes) {
    throw new Error(esVideo ? "El vídeo no puede pesar más de 30 MB." : "La imagen no puede pesar más de 8 MB.");
  }

  const supabase = getSupabaseAdmin();
  const ext = file.name.split(".").pop() || (esVideo ? "mp4" : "jpg");
  const path = `${session.user.schoolId}/${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(HISTORIAS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadError) throw new Error(`No se pudo subir el archivo: ${uploadError.message}`);

  const { data } = supabase.storage.from(HISTORIAS_BUCKET).getPublicUrl(path);

  const expiraEn = new Date(Date.now() + DURACION_HISTORIA_HORAS * 60 * 60 * 1000);

  await prisma.historia.create({
    data: {
      schoolId: session.user.schoolId,
      autorId: session.user.id,
      tipo: esVideo ? "VIDEO" : "IMAGEN",
      imagenUrl: data.publicUrl,
      texto: texto || null,
      expiraEn,
    },
  });

  revalidatePath("/dashboard");
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
