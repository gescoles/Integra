import { prisma } from "./prisma";
import { sendAlertaBloqueoLogin } from "./email";

// Se llama exactamente en el momento en que un correo cruza el umbral de
// 5 intentos fallidos en 15 minutos — una sola vez por bloqueo, no en
// cada intento posterior mientras siga bloqueado.
export async function alertarSuperAdminsBloqueo(emailBloqueado: string) {
  const haceQuinceMinutos = new Date(Date.now() - 15 * 60 * 1000);

  const [intentos, superAdmins] = await Promise.all([
    prisma.intentoLoginFallido.findMany({
      where: { email: emailBloqueado, createdAt: { gte: haceQuinceMinutos } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: "SUPERADMIN" },
      select: { id: true, email: true, name: true },
    }),
  ]);

  const fechas = intentos.map((i) => i.createdAt);

  // Queda constancia permanente del bloqueo — a diferencia de los
  // intentos fallidos (que sí se limpian solos con el tiempo), esto no
  // se borra nunca: se queda PENDIENTE hasta que el SuperAdmin resuelva
  // el caso.
  try {
    await prisma.bloqueoAcceso.create({
      data: {
        email: emailBloqueado,
        cantidadIntentos: fechas.length,
        primerIntento: fechas[0] ?? new Date(),
        ultimoIntento: fechas[fechas.length - 1] ?? new Date(),
      },
    });
  } catch (e) {
    console.error("No se pudo guardar el registro del bloqueo:", e);
  }

  await Promise.all(
    superAdmins.map(async (admin) => {
      try {
        await prisma.notificacion.create({
          data: {
            userId: admin.id,
            tipo: "seguridad",
            titulo: "Acceso bloqueado por intentos fallidos",
            mensaje: `${emailBloqueado} ha fallado ${fechas.length} veces en 15 minutos (contraseña o Teams) y ha quedado bloqueado.`,
            link: "/dashboard/superadmin/seguridad",
          },
        });
      } catch (e) {
        console.error("No se pudo crear la notificación de bloqueo:", e);
      }
      try {
        await sendAlertaBloqueoLogin(admin.email, admin.name ?? admin.email, emailBloqueado, fechas);
      } catch (e) {
        console.error("No se pudo enviar el correo de alerta de bloqueo:", e);
      }
    })
  );
}
