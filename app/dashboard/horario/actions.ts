"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function addHorarioBloque(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const diaSemana = Number(formData.get("diaSemana"));
  const horaInicio = formData.get("horaInicio") as string;
  const horaFin = formData.get("horaFin") as string;
  const asignatura = (formData.get("asignatura") as string)?.trim();
  const grupo = (formData.get("grupo") as string)?.trim();
  const color = (formData.get("color") as string) || "#2F6FED";

  if (!asignatura) throw new Error("La asignatura es obligatoria.");
  if (!horaInicio || !horaFin) throw new Error("Indica la hora de inicio y fin.");
  if (horaFin <= horaInicio) throw new Error("La hora de fin debe ser posterior a la de inicio.");

  await prisma.horarioBloque.create({
    data: {
      profesorId: session.user.id,
      diaSemana,
      horaInicio,
      horaFin,
      asignatura,
      grupo: grupo || null,
      color,
    },
  });

  revalidatePath("/dashboard/horario");
  revalidatePath("/dashboard");
}

export async function deleteHorarioBloque(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const bloque = await prisma.horarioBloque.findUnique({ where: { id } });
  if (!bloque || bloque.profesorId !== session.user.id) {
    throw new Error("No puedes eliminar un bloque que no es tuyo.");
  }

  await prisma.horarioBloque.delete({ where: { id } });
  revalidatePath("/dashboard/horario");
  revalidatePath("/dashboard");
}
