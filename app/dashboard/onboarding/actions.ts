"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyUsers } from "@/lib/notifications";
import { sendOnboardingArchivoEmail } from "@/lib/email";
import { getSupabaseAdmin, ONBOARDING_BUCKET } from "@/lib/supabaseAdmin";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

async function requiereDirectivo() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede gestionar OnBoarding.");
  }
  return session;
}

export async function crearCarpeta(formData: FormData) {
  const session = await requiereDirectivo();
  const schoolId = (formData.get("schoolId") as string) || session.user.schoolId;
  if (!schoolId) throw new Error("Falta indicar el centro.");

  const nombre = (formData.get("nombre") as string)?.trim();
  if (!nombre) throw new Error("Indica el nombre de la carpeta.");

  await prisma.onboardingCarpeta.create({
    data: { schoolId, nombre, creadoPorId: session.user.id },
  });

  revalidatePath("/dashboard/onboarding");
}

export async function eliminarCarpeta(id: string) {
  await requiereDirectivo();

  const carpeta = await prisma.onboardingCarpeta.findUnique({
    where: { id },
    include: { archivos: true },
  });
  if (!carpeta) throw new Error("No se ha encontrado la carpeta.");

  const supabase = getSupabaseAdmin();
  for (const archivo of carpeta.archivos) {
    try {
      const path = archivo.url.split(`${ONBOARDING_BUCKET}/`)[1];
      if (path) await supabase.storage.from(ONBOARDING_BUCKET).remove([decodeURIComponent(path)]);
    } catch {
      // Continuamos igualmente aunque falle borrar algún archivo del storage.
    }
  }

  await prisma.onboardingCarpeta.delete({ where: { id } });
  revalidatePath("/dashboard/onboarding");
}

export async function subirArchivo(formData: FormData) {
  const session = await requiereDirectivo();
  const carpetaId = formData.get("carpetaId") as string;
  const file = formData.get("archivo") as File | null;

  if (!carpetaId) throw new Error("Falta indicar la carpeta.");
  if (!file || file.size === 0) throw new Error("Elige un archivo para subir.");
  if (file.size > 25 * 1024 * 1024) throw new Error("El archivo no puede pesar más de 25 MB.");

  const carpeta = await prisma.onboardingCarpeta.findUnique({
    where: { id: carpetaId },
    include: { school: { select: { id: true, name: true } } },
  });
  if (!carpeta) throw new Error("No se ha encontrado la carpeta.");

  const supabase = getSupabaseAdmin();
  const path = `${carpeta.schoolId}/${carpetaId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(ONBOARDING_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: true });
  if (uploadError) throw new Error(`No se pudo subir el archivo: ${uploadError.message}`);

  const { data } = supabase.storage.from(ONBOARDING_BUCKET).getPublicUrl(path);

  await prisma.onboardingArchivo.create({
    data: {
      carpetaId,
      nombre: file.name,
      url: data.publicUrl,
      tipo: file.type || null,
      tamano: file.size,
      subidoPorId: session.user.id,
    },
  });

  try {
    const usuarios = await prisma.user.findMany({
      where: { schoolId: carpeta.schoolId },
      select: { id: true, email: true },
    });
    const idsUsuarios = usuarios.map((u) => u.id);

    if (idsUsuarios.length > 0) {
      await notifyUsers(idsUsuarios, {
        schoolId: carpeta.schoolId,
        tipo: "ONBOARDING_ARCHIVO",
        titulo: "Nuevo documento de OnBoarding",
        mensaje: `${carpeta.nombre} · ${file.name}`,
        link: "/dashboard/onboarding",
        relatedId: carpetaId,
      });
    }

    await sendOnboardingArchivoEmail({
      to: usuarios.map((u) => u.email).filter(Boolean),
      carpetaNombre: carpeta.nombre,
      archivoNombre: file.name,
      subidoPorNombre: session.user.name ?? session.user.email ?? "Un miembro del equipo",
      schoolName: carpeta.school.name,
    });
  } catch {
    // No pasa nada si falla el aviso; el archivo ya está subido.
  }

  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
    if (rootFolderId) {
      const { ensureSubfolder, uploadGenericFileToDrive } = await import("@/lib/googleDrive");
      const { safeFileName } = await import("@/lib/exportWorkbooks");

      const schoolFolderId = await ensureSubfolder(rootFolderId, safeFileName(carpeta.school.name));
      const onboardingFolderId = await ensureSubfolder(schoolFolderId, "OnBoarding");
      const carpetaFolderId = await ensureSubfolder(onboardingFolderId, safeFileName(carpeta.nombre));
      await uploadGenericFileToDrive(carpetaFolderId, file.name, Buffer.from(bytes), file.type || "application/octet-stream");
    }
  } catch {
    // No pasa nada si falla Drive; el archivo ya está guardado en la app.
  }

  revalidatePath("/dashboard/onboarding");
}

export async function eliminarArchivo(id: string) {
  await requiereDirectivo();

  const archivo = await prisma.onboardingArchivo.findUnique({ where: { id } });
  if (!archivo) throw new Error("No se ha encontrado el archivo.");

  try {
    const supabase = getSupabaseAdmin();
    const path = archivo.url.split(`${ONBOARDING_BUCKET}/`)[1];
    if (path) await supabase.storage.from(ONBOARDING_BUCKET).remove([decodeURIComponent(path)]);
  } catch {
    // Seguimos igualmente aunque falle borrar del storage.
  }

  await prisma.onboardingArchivo.delete({ where: { id } });
  revalidatePath("/dashboard/onboarding");
}
