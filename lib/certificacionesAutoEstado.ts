import { prisma } from "./prisma";

// Calcula qué estado le corresponde a una certificación según sus fechas
// y el día de hoy — pura, sin tocar la base de datos, para poder
// reutilizarla tanto en el cron nocturno como al editar a mano.
export function calcularEstadoPorFechas(fechaInicioPreparacion: Date, fechaFinPreparacion: Date | null): "PROGRAMADA" | "EN_CURSO" | "ACABADA" {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const inicio = new Date(fechaInicioPreparacion);
  inicio.setHours(0, 0, 0, 0);
  const fin = fechaFinPreparacion ? new Date(fechaFinPreparacion) : null;
  if (fin) fin.setHours(0, 0, 0, 0);

  if (fin && hoy >= fin) return "ACABADA";
  if (hoy >= inicio) return "EN_CURSO";
  return "PROGRAMADA";
}

// Cada noche se comprueban las fechas de todas las certificaciones que
// todavía no han "Acabado", y se les cambia el estado solas si toca:
// - Si ya ha llegado (o pasado) la fecha de fin de preparación → Acabada.
// - Si no, pero ya ha llegado (o pasado) la fecha de inicio → En curso.
// Aquí SÍ se respeta una que ya esté "Acabada" (no se reabre solo porque
// pase el tiempo) — para eso está la otra función, calcularEstadoPorFechas,
// que se usa al EDITAR una certificación a mano.
export async function actualizarEstadosCertificacionesPorFecha() {
  const candidatas = await prisma.certificacion.findMany({
    where: { estado: { not: "ACABADA" } },
    select: { id: true, estado: true, fechaInicioPreparacion: true, fechaFinPreparacion: true },
  });

  let pasadasAEnCurso = 0;
  let pasadasAAcabada = 0;

  for (const c of candidatas) {
    const nuevoEstadoCalculado = calcularEstadoPorFechas(c.fechaInicioPreparacion, c.fechaFinPreparacion);
    if (nuevoEstadoCalculado === "PROGRAMADA") continue; // todavía no toca cambiar nada
    if (nuevoEstadoCalculado === c.estado) continue; // ya estaba así, no hace falta escribir

    await prisma.certificacion.update({ where: { id: c.id }, data: { estado: nuevoEstadoCalculado } });
    if (nuevoEstadoCalculado === "ACABADA") pasadasAAcabada += 1;
    else pasadasAEnCurso += 1;
  }

  return { revisadas: candidatas.length, pasadasAEnCurso, pasadasAAcabada };
}
