"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Guarda el token push del móvil de quien ha entrado — lo llama la propia
// app nada más dar permiso, desde dentro de la app Android (no hace nada
// si se llama desde un navegador normal, ya que ahí nunca se pide el
// permiso ni se genera token). Un mismo token solo puede pertenecer a un
// usuario a la vez (por ejemplo, si cierra sesión y entra otra persona en
// el mismo móvil), así que se reasigna en vez de duplicarlo.
export async function registrarDeviceToken(token: string, plataforma: string = "android") {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !token) return;

  await prisma.deviceToken.upsert({
    where: { token },
    create: { token, userId: session.user.id, plataforma },
    update: { userId: session.user.id, plataforma },
  });
}

// Al cerrar sesión desde la app, se borra el token de este dispositivo —
// así, si otra persona usa el mismo móvil después, no le sigan llegando
// las notificaciones push de quien ya no ha iniciado sesión.
export async function eliminarDeviceToken(token: string) {
  if (!token) return;
  await prisma.deviceToken.deleteMany({ where: { token } });
}

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

export async function eliminarNotificacion(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return;

  // Solo se puede borrar la propia notificación — el where ya lo garantiza,
  // así nadie puede borrar notificaciones de otro usuario aunque manipule
  // la petición.
  await prisma.notificacion.deleteMany({
    where: { id, userId: session.user.id },
  });
  revalidatePath("/dashboard");
}

// Borra, solo para el usuario que ha entrado, todas sus notificaciones de
// un tipo concreto — lo usa el aviso de "pendiente de comprar" en la
// pantalla principal para desaparecer en cuanto se le da clic, sin tocar
// el resto de notificaciones ni las de otros usuarios.
export async function eliminarNotificacionesPorTipo(tipo: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return;

  await prisma.notificacion.deleteMany({
    where: { userId: session.user.id, tipo },
  });
  revalidatePath("/dashboard");
}

export async function eliminarTodasNotificaciones() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return;

  await prisma.notificacion.deleteMany({
    where: { userId: session.user.id },
  });
  revalidatePath("/dashboard");
}
