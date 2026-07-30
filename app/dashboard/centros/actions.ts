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
    },
  });

  revalidatePath("/dashboard/centros");
}

export async function deleteSchool(id: string) {
  if (!id) {
    throw new Error("Falta el identificador del centro.");
  }

  const [usersCount, tutoriasCount, guardiasCount, materialCount] = await Promise.all([
    prisma.user.count({ where: { schoolId: id } }),
    prisma.tutoria.count({ where: { schoolId: id } }),
    prisma.guardia.count({ where: { schoolId: id } }),
    prisma.materialRequest.count({ where: { schoolId: id } }),
  ]);

  const total = usersCount + tutoriasCount + guardiasCount + materialCount;
  if (total > 0) {
    throw new Error(
      `No se puede eliminar: este centro tiene ${usersCount} usuario(s), ${tutoriasCount} tutoría(s), ${guardiasCount} guardia(s) y ${materialCount} solicitud(es) de material asociadas. Elimínalos o reasígnalos primero.`
    );
  }

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
