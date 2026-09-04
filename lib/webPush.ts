import webpush from "web-push";

let vapidConfigurado = false;

function asegurarVapid() {
  if (vapidConfigurado) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigurado = true;
  return true;
}

/**
 * Manda una notificación push del navegador (Web Push estándar) a una
 * lista de suscripciones — funciona en Android e iPhone/iPad, siempre que
 * el usuario haya "añadido la web a pantalla de inicio". Mejor esfuerzo:
 * si VAPID no está configurado, o el envío falla, no lanza — la
 * notificación ya se ha guardado en la base de datos de todas formas.
 * Devuelve los "endpoint" de las suscripciones que ya no son válidas
 * (la persona quitó el permiso, o desinstaló la PWA) para poder
 * borrarlas.
 */
export async function sendWebPushToSubscriptions(
  subscriptions: { endpoint: string; p256dh: string; auth: string }[],
  data: { titulo: string; mensaje: string; link?: string | null }
): Promise<string[]> {
  if (subscriptions.length === 0) return [];
  if (!asegurarVapid()) {
    console.error(
      "[push] sendWebPushToSubscriptions: VAPID no configurado — faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT en este entorno"
    );
    return [];
  }

  const payload = JSON.stringify({
    title: data.titulo,
    body: data.mensaje,
    link: data.link ?? "/dashboard",
  });

  const caducadas: string[] = [];

  console.log(`[push] sendWebPushToSubscriptions: enviando a ${subscriptions.length} suscripción(es)`);
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const res = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        console.log(`[push] OK endpoint=${sub.endpoint.slice(0, 40)}... status=${res.statusCode}`);
      } catch (e: unknown) {
        // 404/410 = la suscripción ya no existe (el usuario quitó el
        // permiso, desinstaló la PWA, o cambió de navegador) — se puede
        // borrar sin problema, no es un error real.
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          console.log(`[push] CADUCADA (${status}) endpoint=${sub.endpoint.slice(0, 40)}...`);
          caducadas.push(sub.endpoint);
        } else {
          console.error(`[push] FALLO endpoint=${sub.endpoint.slice(0, 40)}... status=${status}`, e);
        }
      }
    })
  );

  return caducadas;
}
