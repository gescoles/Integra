import { prisma } from "@/lib/prisma";

// Alumnos con 3 o más incidencias registradas, a los que TODAVÍA no se les
// ha abierto ningún expediente (ni borrador ni enviado) — son los que
// "hay que revisar" para decidir si procede abrir expediente. Este es el
// aviso que sale en la pestaña de Expedientes y en Inicio.
export async function obtenerAlumnosConTresIncidenciasSinExpediente(schoolId: string) {
  const alumnos = await prisma.alumno.findMany({
    where: {
      schoolId,
      incidencias: { some: {} },
    },
    select: {
      id: true,
      nombre: true,
      curso: true,
      avatarUrl: true,
      _count: { select: { incidencias: true } },
      incidencias: {
        select: {
          id: true,
          fecha: true,
          tipoIncidencia: true,
          expedientes: { select: { id: true } },
        },
        orderBy: { fecha: "desc" },
      },
    },
  });

  return alumnos
    .filter((a) => a._count.incidencias >= 3)
    .filter((a) => !a.incidencias.some((i) => i.expedientes.length > 0))
    .map((a) => ({
      id: a.id,
      nombre: a.nombre,
      curso: a.curso,
      avatarUrl: a.avatarUrl,
      totalIncidencias: a._count.incidencias,
      ultimaIncidenciaFecha: a.incidencias[0]?.fecha.toISOString() ?? null,
      ultimaIncidenciaTipo: a.incidencias[0]?.tipoIncidencia ?? null,
    }));
}

export async function contarAlumnosConTresIncidenciasSinExpediente(schoolId: string) {
  const alumnos = await obtenerAlumnosConTresIncidenciasSinExpediente(schoolId);
  return alumnos.length;
}

// Alumnos que YA están siendo expulsados: tienen al menos un expediente
// abierto (en borrador o ya enviado). Esta es la lista de la pestaña
// "Expulsions" — gente en pleno proceso, no gente pendiente de revisar.
export async function obtenerAlumnosEnProcesoExpulsion(schoolId: string) {
  const alumnos = await prisma.alumno.findMany({
    where: {
      schoolId,
      incidencias: { some: { expedientes: { some: {} } } },
    },
    select: {
      id: true,
      nombre: true,
      curso: true,
      avatarUrl: true,
      _count: { select: { incidencias: true } },
      incidencias: {
        where: { expedientes: { some: {} } },
        select: {
          id: true,
          fecha: true,
          tipoIncidencia: true,
          expedientes: {
            select: { id: true, numero: true, estado: true, sancionDias: true, fechaAplicacionInicio: true, fechaAplicacionFin: true },
            orderBy: { fechaInicio: "desc" },
          },
        },
        orderBy: { fecha: "desc" },
      },
    },
  });

  return alumnos.map((a) => {
    const expedientesDelAlumno = a.incidencias.flatMap((i) => i.expedientes);
    const masReciente = expedientesDelAlumno[0] ?? null;
    return {
      id: a.id,
      nombre: a.nombre,
      curso: a.curso,
      avatarUrl: a.avatarUrl,
      totalIncidencias: a._count.incidencias,
      expedienteEstado: masReciente?.estado ?? null,
      expedienteNumero: masReciente?.numero ?? null,
      sancionDias: masReciente?.sancionDias ?? null,
      fechaAplicacionInicio: masReciente?.fechaAplicacionInicio?.toISOString() ?? null,
      fechaAplicacionFin: masReciente?.fechaAplicacionFin?.toISOString() ?? null,
    };
  });
}

export async function contarAlumnosEnProcesoExpulsion(schoolId: string) {
  const alumnos = await obtenerAlumnosEnProcesoExpulsion(schoolId);
  return alumnos.length;
}
