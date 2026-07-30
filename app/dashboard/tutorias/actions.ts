"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TutoriaStatus } from "@prisma/client";

export async function updateTutoriaStatus(id: string, status: TutoriaStatus) {
  await prisma.tutoria.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard");
}
