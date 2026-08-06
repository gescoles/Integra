"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getMyNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { notificaciones: [], noLeidas: 0 };

  const [notificaciones, noLeidas] = await Promise.all([
    prisma.notificacion.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notificacion.count({ where: { userId: session.user.id, leida: false } }),
  ]);

  return {
    notificaciones: notificaciones.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      mensaje: n.mensaje,
      link: n.link,
      leida: n.leida,
      createdAt: n.createdAt.toISOString(),
    })),
    noLeidas,
  };
}

export async function marcarNotificacionLeida(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return;

  await prisma.notificacion.updateMany({
    where: { id, userId: session.user.id },
    data: { leida: true },
  });
  revalidatePath("/dashboard");
}

export async function marcarTodasLeidas() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return;

  await prisma.notificacion.updateMany({
    where: { userId: session.user.id, leida: false },
    data: { leida: true },
  });
  revalidatePath("/dashboard");
}
