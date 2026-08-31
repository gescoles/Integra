"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Plan, SchoolStatus, SchoolType } from "@prisma/client";
import { getSupabaseAdmin, SCHOOL_LOGOS_BUCKET } from "@/lib/supabaseAdmin";

export async function createSchool(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as SchoolType;
  const city = (formData.get("city") as string)?.trim();
  const plan = formData.get("plan") as Plan;
  const userLimitRaw = formData.get("userLimit") as string;
  const modules = formData.getAll("modules") as string[];
  const cursoAcademico = (formData.get("cursoAcademico") as string)?.trim();

  if (!name) {
    throw new Error("El nombre del centro es obligatorio.");
  }

  await prisma.school.create({
    data: {
      name,
      type: type || "PRIVADO",
      city: city || null,
      plan: plan || "BASICO",
      userLimit: Number(userLimitRaw) || 50,
      modules,
      cursoAcademico: cursoAcademico || null,
    },
  });

  revalidatePath("/dashboard/centros");
}

export async function saveSchoolSettings(formData: FormData) {
  const id = formData.get("id") as string;
  const plan = formData.get("plan") as Plan;
  const status = formData.get("status") as SchoolStatus;
  const userLimitRaw = formData.get("userLimit") as string;
  const modules = formData.getAll("modules") as string[];
  const cursoAcademico = (formData.get("cursoAcademico") as string)?.trim();

  if (!id) {
    throw new Error("Falta el identificador del centro.");
  }

  await prisma.school.update({
    where: { id },
    data: {
      plan,
      status,
      userLimit: Number(userLimitRaw) || 50,
      modules,
      cursoAcademico: cursoAcademico || null,
    },
  });

  revalidatePath("/dashboard/centros");
}

export async function getSchoolDeleteImpact(id: string) {
  const [usuarios, tutorias, guardias, material, alumnos, avisos] = await Promise.all([
    prisma.user.count({ where: { schoolId: id } }),
    prisma.tutoria.count({ where: { schoolId: id } }),
    prisma.guardia.count({ where: { schoolId: id } }),
    prisma.materialRequest.count({ where: { schoolId: id } }),
    prisma.alumno.count({ where: { schoolId: id } }),
    prisma.aviso.count({ where: { schoolId: id } }),
  ]);
  return { usuarios, tutorias, guardias, material, alumnos, avisos };
}

export async function deleteSchool(id: string) {
  if (!id) {
    throw new Error("Falta el identificador del centro.");
  }

  const usuarios = await prisma.user.findMany({ where: { schoolId: id }, select: { id: true } });
  const userIds = usuarios.map((u) => u.id);

  const alumnosDelCentro = await prisma.alumno.findMany({
    where: { schoolId: id },
    select: { id: true },
  });
  const alumnoIds = alumnosDelCentro.map((a) => a.id);

  const empresasDelCentro = await prisma.empresa.findMany({ where: { schoolId: id }, select: { id: true } });
  const empresaIds = empresasDelCentro.map((e) => e.id);

  // Se borra todo lo asociado, en el orden correcto para no romper claves foráneas.
  if (alumnoIds.length > 0) {
    await prisma.alumnoContacto.deleteMany({ where: { alumnoId: { in: alumnoIds } } });
  }
  // Prácticas: al borrar la ficha, Prisma se encarga solo de sus convenios,
  // prórrogas y tutorías de seguimiento (todas en cascada), pero hay que
  // borrar la ficha ANTES que el alumno al que pertenece.
  await prisma.practicaAlumno.deleteMany({ where: { schoolId: id } });
  await prisma.salida.deleteMany({ where: { schoolId: id } });
  await prisma.historia.deleteMany({ where: { schoolId: id } });
  await prisma.tutoria.deleteMany({ where: { schoolId: id } });
  await prisma.guardia.deleteMany({ where: { schoolId: id } });
  await prisma.materialRequest.deleteMany({ where: { schoolId: id } });
  await prisma.expediente.deleteMany({ where: { schoolId: id } });
  await prisma.onboardingCarpeta.deleteMany({ where: { schoolId: id } });
  await prisma.espacioPlanta.deleteMany({ where: { schoolId: id } });
  await prisma.coberturaGuardia.deleteMany({ where: { schoolId: id } });
  await prisma.incidencia.deleteMany({ where: { schoolId: id } });
  await prisma.alumno.deleteMany({ where: { schoolId: id } });
  await prisma.aviso.deleteMany({ where: { schoolId: id } });
  if (userIds.length > 0) {
    await prisma.horarioBloque.deleteMany({ where: { profesorId: { in: userIds } } });
    await prisma.calendarEvento.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notificacion.deleteMany({ where: { userId: { in: userIds } } });
  }

  // Módulos añadidos después de escribir esta función — igual que pasó
  // con el borrado de usuarios, hacía falta sumarlos aquí también.
  await prisma.certificacion.deleteMany({ where: { schoolId: id } });
  await prisma.noticia.deleteMany({ where: { schoolId: id } });
  await prisma.chatMensaje.deleteMany({ where: { schoolId: id } });
  if (empresaIds.length > 0) {
    await prisma.empresaDocumento.deleteMany({ where: { empresaId: { in: empresaIds } } });
    await prisma.empresaHistorial.deleteMany({ where: { empresaId: { in: empresaIds } } });
    await prisma.empresaObservacion.deleteMany({ where: { empresaId: { in: empresaIds } } });
  }
  await prisma.empresa.deleteMany({ where: { schoolId: id } });
  // Por si quedara algún ConvenioModulo suelto de otro centro apuntando
  // aquí (no debería, pero es una red de seguridad barata).
  await prisma.convenioModulo.deleteMany({ where: { moduloProfesional: { schoolId: id } } });
  await prisma.moduloProfesional.deleteMany({ where: { schoolId: id } });
  await prisma.departamento.deleteMany({ where: { schoolId: id } });

  await prisma.user.deleteMany({ where: { schoolId: id } });

  await prisma.school.delete({ where: { id } });
  revalidatePath("/dashboard/centros");
}

export async function uploadSchoolLogo(formData: FormData) {
  const schoolId = formData.get("schoolId") as string;
  const file = formData.get("logo") as File | null;

  if (!schoolId) throw new Error("Falta el identificador del centro.");
  if (!file || file.size === 0) throw new Error("No se ha seleccionado ninguna imagen.");

  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen (JPG, PNG, WEBP...).");
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error("La imagen no puede pesar más de 3 MB.");
  }

  const supabase = getSupabaseAdmin();
  const ext = file.name.split(".").pop() || "png";
  const path = `${schoolId}/logo-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(SCHOOL_LOGOS_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(SCHOOL_LOGOS_BUCKET).getPublicUrl(path);

  await prisma.school.update({
    where: { id: schoolId },
    data: { logoUrl: data.publicUrl },
  });

  revalidatePath("/dashboard/centros");
  revalidatePath("/dashboard");
}
