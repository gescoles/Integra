"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createEvento(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const title = (formData.get("title") as string)?.trim();
  const fecha = formData.get("fecha") as string;
  const horaInicio = formData.get("horaInicio") as string;
  const horaFin = formData.get("horaFin") as string;
  const color = (formData.get("color") as string) || "#FD5249";

  if (!title) throw new Error("El título del evento es obligatorio.");
  if (!fecha) throw new Error("Indica la fecha.");
  if (!horaInicio || !horaFin) throw new Error("Indica la hora de inicio y fin.");
  if (horaFin <= horaInicio) throw new Error("La hora de fin debe ser posterior a la de inicio.");

  const [y, m, d] = fecha.split("-").map(Number);
  const fechaEvento = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fechaEvento < hoy) {
    throw new Error("No puedes programar un evento en una fecha anterior a hoy.");
  }

  await prisma.calendarEvento.create({
    data: {
      userId: session.user.id,
      title,
      fecha: new Date(y, m - 1, d),
      horaInicio,
      horaFin,
      color,
    },
  });

  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard");
}

export async function deleteEvento(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const evento = await prisma.calendarEvento.findUnique({ where: { id } });
  if (!evento || evento.userId !== session.user.id) {
    throw new Error("No puedes eliminar un evento que no es tuyo.");
  }

  await prisma.calendarEvento.delete({ where: { id } });
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard");
}
