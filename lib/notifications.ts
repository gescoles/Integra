import { prisma } from "@/lib/prisma";

export async function notifyUsers(
  userIds: string[],
  data: { schoolId: string; tipo: string; titulo: string; mensaje: string; link?: string; relatedId?: string }
) {
  if (userIds.length === 0) return;
  await prisma.notificacion.createMany({
    data: userIds.map((userId) => ({
      userId,
      schoolId: data.schoolId,
      tipo: data.tipo,
      titulo: data.titulo,
      mensaje: data.mensaje,
      link: data.link ?? null,
      relatedId: data.relatedId ?? null,
    })),
  });
}

/**
 * Cuando una salida (u otra cosa) se resuelve, las notificaciones que
 * avisaban de que estaba "pendiente" ya no tienen sentido para nadie más:
 * las borramos de golpe para todo el mundo, no solo para quien la resolvió.
 */
export async function clearNotificationsFor(relatedId: string) {
  await prisma.notificacion.deleteMany({ where: { relatedId } });
}
