"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Plan, SchoolStatus, SchoolType } from "@prisma/client";

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
