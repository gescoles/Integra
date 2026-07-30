"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TutoriaStatus } from "@prisma/client";

export async function updateTutoriaStatus(id: string, status: TutoriaStatus) {
  await prisma.tutoria.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard");
}

export async function createTutoria(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) {
    throw new Error("No autorizado.");
  }

  const studentName = (formData.get("studentName") as string)?.trim();
  const cicloModulo = (formData.get("cicloModulo") as string)?.trim();
  const sessionDateRaw = formData.get("sessionDate") as string;
  // Si es Coordinación, puede asignarla a otro profesor; si no, es para sí mismo
  const profesorId = (formData.get("profesorId") as string) || session.user.id;

  if (!studentName) throw new Error("El nombre del alumno es obligatorio.");
  if (!sessionDateRaw) throw new Error("Indica la fecha y hora de la tutoría.");

  await prisma.tutoria.create({
    data: {
      schoolId: session.user.schoolId,
      profesorId,
      studentName,
      cicloModulo: cicloModulo || null,
      sessionDate: new Date(sessionDateRaw),
      status: "NUEVA",
    },
  });

  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard");
}
