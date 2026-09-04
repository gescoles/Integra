import { prisma } from "@/lib/prisma";
import { sendPushToTokens } from "@/lib/firebaseAdmin";
import { sendWebPushToSubscriptions } from "@/lib/webPush";

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
  // verdad a quien tenga la app Android instalada y haya dado permiso
  // (Firebase) y/o la web guardada en pantalla de inicio (Web Push,
  // Android o iPhone/iPad) — mejor esfuerzo en los dos casos: si algo no
  // está configurado o falla, la notificación ya se ha guardado
  // igualmente arriba, en la campanita de la app.
  try {
    const [tokens, subscripciones] = await Promise.all([
      prisma.deviceToken.findMany({ where: { userId: { in: userIds } }, select: { token: true } }),
      prisma.webPushSubscription.findMany({
        where: { userId: { in: userIds } },
        select: { endpoint: true, p256dh: true, auth: true },
      }),
    ]);
    console.log(`[push] notifyUsers: ${tokens.length} token(s) FCM, ${subscripciones.length} suscripción(es) WebPush para ${userIds.join(",")}`);

    await Promise.all([
      tokens.length > 0
        ? sendPushToTokens(
            tokens.map((t) => t.token),
            { titulo: data.titulo, mensaje: data.mensaje, link: data.link }
          ).then(() => console.log("[push] sendPushToTokens: terminado"))
        : Promise.resolve(),
      subscripciones.length > 0
        ? sendWebPushToSubscriptions(subscripciones, {
            titulo: data.titulo,
            mensaje: data.mensaje,
            link: data.link,
          }).then((caducadas) => {
            console.log(`[push] sendWebPushToSubscriptions: terminado, ${caducadas.length} caducada(s)`);
            if (caducadas.length > 0) {
              return prisma.webPushSubscription.deleteMany({ where: { endpoint: { in: caducadas } } });
            }
          })
        : Promise.resolve(),
    ]);
    console.log("[push] notifyUsers: Promise.all de envío terminado sin excepciones");
  } catch (e) {
    console.error("[push] No se pudo mandar la notificación push:", e);
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
