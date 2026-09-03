import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let cachedApp: App | null = null;

// Credenciales de la cuenta de servicio de Firebase (Project settings >
// Service accounts > Generate new private key, en la consola de
// Firebase) — se guardan como 3 variables de entorno sueltas en vez de
// subir el JSON entero, para no tener que escapar comillas/saltos de
// línea al pegarlo en Vercel. FIREBASE_PRIVATE_KEY lleva los saltos de
// línea como "\n" literales; hay que deshacerlos aquí.
function getFirebaseApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "Faltan las variables de entorno de Firebase (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) — hacen falta para mandar notificaciones push a la app Android."
    );
  }

  cachedApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
    }),
  });

  return cachedApp;
}

/**
 * Manda una notificación push de verdad (a nivel de sistema operativo,
 * aunque la app esté cerrada) a una lista de tokens de dispositivo.
 * Mejor esfuerzo: si Firebase no está configurado, o el envío falla, no
 * lanza — quien llame a esto ya tiene la notificación guardada en la
 * base de datos de todas formas.
 */
export async function sendPushToTokens(
  tokens: string[],
  data: { titulo: string; mensaje: string; link?: string | null }
) {
  if (tokens.length === 0) return;
  if (!process.env.FIREBASE_PROJECT_ID) return;

  try {
    const messaging = getMessaging(getFirebaseApp());
    // sendEachForMulticast admite hasta 500 tokens por llamada; con el
    // volumen de un centro educativo nunca se llega ahí, pero se trocea
    // por si acaso.
    for (let i = 0; i < tokens.length; i += 500) {
      const lote = tokens.slice(i, i + 500);
      const resultado = await messaging.sendEachForMulticast({
        tokens: lote,
        notification: { title: data.titulo, body: data.mensaje },
        data: data.link ? { link: data.link } : {},
        android: { priority: "high" },
      });

      // Si un token ya no es válido (la app se desinstaló, por ejemplo),
      // lo borramos para no volver a intentarlo cada vez.
      const invalidos: string[] = [];
      resultado.responses.forEach((r, idx) => {
        if (!r.success && r.error) {
          const codigo = r.error.code;
          if (
            codigo === "messaging/registration-token-not-registered" ||
            codigo === "messaging/invalid-registration-token"
          ) {
            invalidos.push(lote[idx]);
          }
        }
      });
      if (invalidos.length > 0) {
        const { prisma } = await import("@/lib/prisma");
        await prisma.deviceToken.deleteMany({ where: { token: { in: invalidos } } }).catch(() => {});
      }
    }
  } catch (e) {
    console.error("No se pudo mandar la notificación push:", e);
  }
}
