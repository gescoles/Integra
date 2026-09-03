import { prisma } from "@/lib/prisma";
import { sendPushToTokens } from "@/lib/firebaseAdmin";

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

  // Además de guardarla en la app, se manda como notificación push de
  // verdad a quien tenga la app Android instalada y haya dado permiso —
  // mejor esfuerzo: si Firebase no está configurado o falla, la
  // notificación ya se ha guardado igualmente arriba.
  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });
    if (tokens.length > 0) {
      await sendPushToTokens(
        tokens.map((t) => t.token),
        { titulo: data.titulo, mensaje: data.mensaje, link: data.link }
      );
    }
  } catch (e) {
    console.error("No se pudo mandar la notificación push:", e);
  }
}

/**
 * Cuando una salida (u otra cosa) se resuelve, las notificaciones que
 * avisaban de que estaba "pendiente" ya no tienen sentido para nadie más:
 * las borramos de golpe para todo el mundo, no solo para quien la resolvió.
 */
export async function clearNotificationsFor(relatedId: string) {
  await prisma.notificacion.deleteMany({ where: { relatedId } });
}
