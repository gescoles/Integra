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

/** La próxima guardia asignada al profesor a partir de ahora, sea hoy o en un día futuro. */
export function obtenerProximaGuardia(profesorId: string, ahora: Date = new Date()) {
  return prisma.guardia.findFirst({
    where: { profesorId, fecha: { gte: ahora } },
    orderBy: { fecha: "asc" },
  });
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
