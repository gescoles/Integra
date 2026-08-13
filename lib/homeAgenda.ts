import { prisma } from "@/lib/prisma";

function aMinutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * De un horario semanal recurrente (bloques con día 1-7 + hora, sin fecha
 * concreta), encuentra cuál cae antes a partir de ahora mismo: puede ser
 * hoy (si todavía no ha empezado) o cualquier día de la semana que viene.
 * Antes, "próxima clase" solo miraba el horario de HOY, así que en cuanto
 * pasaba la última clase del día se quedaba vacío hasta el día siguiente.
 */
export function proximoBloqueSemanal<T extends { diaSemana: number; horaInicio: string }>(
  bloques: T[],
  ahora: Date = new Date()
): T | null {
  if (bloques.length === 0) return null;
  const diaSemanaHoy = ahora.getDay() === 0 ? 7 : ahora.getDay();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  let mejor: T | null = null;
  let mejorDistancia = Infinity;
  for (const b of bloques) {
    let diasHasta = b.diaSemana - diaSemanaHoy;
    if (diasHasta < 0) diasHasta += 7;
    const horaMin = aMinutos(b.horaInicio);
    // Si es hoy pero la hora ya ha pasado, la próxima es dentro de 7 días.
    if (diasHasta === 0 && horaMin <= minutosAhora) diasHasta = 7;
    const distancia = diasHasta * 24 * 60 + horaMin;
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = b;
    }
  }
  return mejor;
}

/** Fecha/hora real (Date) en la que cae un bloque semanal recurrente la próxima vez. */
export function fechaDeProximoBloque(diaSemana: number, horaInicio: string, ahora: Date = new Date()) {
  const diaSemanaHoy = ahora.getDay() === 0 ? 7 : ahora.getDay();
  const [h, m] = horaInicio.split(":").map(Number);
  let diasHasta = diaSemana - diaSemanaHoy;
  if (diasHasta < 0) diasHasta += 7;
  if (diasHasta === 0 && h * 60 + m <= ahora.getHours() * 60 + ahora.getMinutes()) diasHasta = 7;
  const d = new Date(ahora);
  d.setDate(d.getDate() + diasHasta);
  d.setHours(h, m, 0, 0);
  return d;
}

/** La próxima tutoría del profesor a partir de ahora, sea hoy o en un día futuro. */
export function obtenerProximaTutoria(profesorId: string, ahora: Date = new Date()) {
  return prisma.tutoria.findFirst({
    where: { profesorId, sessionDate: { gte: ahora } },
    orderBy: { sessionDate: "asc" },
  });
}

/**
 * La próxima guardia del profesor a partir de ahora, sea hoy o en un día
 * futuro. Mira las DOS fuentes que existen en la app:
 * 1. Guardia — creadas a mano por dirección con "+ Nueva guardia".
 * 2. CoberturaGuardia — asignadas al profesor como sustituto al resolver
 *    el aviso de ausencia de otro compañero (esta es la misma fuente que
 *    usa la alerta roja "Tienes X guardia que cubrir" en el inicio, así
 *    que ambas ahora coinciden siempre).
 * Devuelve la que caiga antes de las dos, ya normalizada a la forma
 * { fecha, turno, ubicacion } que espera el widget de la agenda.
 */
export async function obtenerProximaGuardia(profesorId: string, ahora: Date = new Date()) {
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);

  const [guardiaPropia, coberturaAsignada] = await Promise.all([
    prisma.guardia.findFirst({
      where: { profesorId, fecha: { gte: ahora } },
      orderBy: { fecha: "asc" },
    }),
    prisma.coberturaGuardia.findMany({
      where: { profesorSustitutoId: profesorId, estado: "ASIGNADA", fecha: { gte: hoy } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  // De las coberturas asignadas, la primera cuya hora de fin no haya
  // pasado ya hoy (mismo criterio que la alerta roja del inicio).
  const esHoy = (f: Date) => f.toDateString() === ahora.toDateString();
  const horaFinYaPaso = (horaFin: string) => {
    const [h, m] = horaFin.split(":").map(Number);
    return h * 60 + m <= ahora.getHours() * 60 + ahora.getMinutes();
  };
  const proximaCobertura = coberturaAsignada.find((c) => !(esHoy(c.fecha) && horaFinYaPaso(c.horaFin))) ?? null;

  const candidatas = [
    guardiaPropia
      ? { fecha: guardiaPropia.fecha, turno: guardiaPropia.turno, ubicacion: guardiaPropia.ubicacion }
      : null,
    proximaCobertura
      ? {
          fecha: proximaCobertura.fecha,
          turno: `${proximaCobertura.horaInicio}–${proximaCobertura.horaFin}`,
          ubicacion: proximaCobertura.ubicacion,
        }
      : null,
  ].filter((c): c is { fecha: Date; turno: string; ubicacion: string | null } => c !== null);

  if (candidatas.length === 0) return null;
  return candidatas.reduce((antes, actual) => (actual.fecha < antes.fecha ? actual : antes));
}

/**
 * El próximo evento de calendario del usuario a partir de ahora. Como
 * `fecha` y `horaInicio` van separados, se piden los eventos desde hoy y
 * se filtra en memoria por la hora real, para no perder los de más
 * adelante en la semana.
 */
export async function obtenerProximoEvento(userId: string, ahora: Date = new Date()) {
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);

  const candidatos = await prisma.calendarEvento.findMany({
    where: { userId, fecha: { gte: hoy } },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
    take: 30,
  });

  for (const e of candidatos) {
    const [h, m] = e.horaInicio.split(":").map(Number);
    const inicio = new Date(e.fecha);
    inicio.setHours(h, m, 0, 0);
    if (inicio >= ahora) return e;
  }
  return null;
}
