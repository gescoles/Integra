import { prisma } from "@/lib/prisma";

/**
 * Cuenta las coberturas de guardia asignadas a un profesor (como
 * sustituto) que todavía están por venir: los días futuros cuentan
 * enteros, y las de hoy solo si su hora de fin no ha pasado ya. Así, en
 * cuanto termina la hora de la guardia, deja de contar (y por tanto deja
 * de salir el aviso en la pantalla de inicio).
 */
export async function contarGuardiasPendientesDeCubrir(schoolId: string, profesorId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const candidatas = await prisma.coberturaGuardia.findMany({
    where: { schoolId, profesorSustitutoId: profesorId, estado: "ASIGNADA", fecha: { gte: hoy } },
    select: { fecha: true, horaFin: true },
  });

  const ahora = new Date();
  const esHoy = (f: Date) => f.toDateString() === ahora.toDateString();
  const horaFinYaPaso = (horaFin: string) => {
    const [h, m] = horaFin.split(":").map(Number);
    const finMin = h * 60 + m;
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    return finMin <= ahoraMin;
  };

  return candidatas.filter((c) => !(esHoy(c.fecha) && horaFinYaPaso(c.horaFin))).length;
}
