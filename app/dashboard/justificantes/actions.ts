"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendJustificanteAvisoEmail } from "@/lib/email";
import { notifyUsers } from "@/lib/notifications";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

// Para SuperAdmin (que consulta un centro concreto por parámetro en la
// URL) se respeta el schoolId que llega; para cualquier otro rol, se
// ignora ese parámetro y se usa siempre su propio centro — así nadie
// puede consultar o tocar justificantes de un centro que no es el suyo
// solo cambiando el parámetro a mano.
async function resolverSchoolId(schoolIdSolicitado: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return null;
  if (session.user.role === "SUPERADMIN") return schoolIdSolicitado || null;
  return session.user.schoolId ?? null;
}

// Listado principal del módulo: todos los alumnos del centro, con quién
// es su tutor — todos los profesores pueden verlo, aunque solo puedan
// AÑADIR justificantes a los que ellos mismos tutorizan (eso se
// controla en crearJustificante, no aquí).
export async function obtenerAlumnosParaJustificantes(schoolIdSolicitado: string) {
  const session = await getServerSession(authOptions);
  const schoolId = await resolverSchoolId(schoolIdSolicitado);
  if (!session?.user.id || !schoolId) return [];

  const alumnos = await prisma.alumno.findMany({
    where: { schoolId },
    select: {
      id: true,
      nombre: true,
      curso: true,
      avatarUrl: true,
      profesorId: true,
      profesor: { select: { name: true, email: true } },
      _count: { select: { justificantes: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return alumnos.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    curso: a.curso,
    avatarUrl: a.avatarUrl,
    tutorId: a.profesorId,
    tutorNombre: a.profesor.name ?? a.profesor.email,
    totalJustificantes: a._count.justificantes,
  }));
}

// Para el filtro "Tutor" de Dirección/Coordinación.
export async function obtenerProfesoresParaFiltroJustificantes(schoolIdSolicitado: string) {
  const session = await getServerSession(authOptions);
  if (!esDirectivo(session?.user.role)) return [];
  const schoolId = await resolverSchoolId(schoolIdSolicitado);
  if (!schoolId) return [];

  const profesores = await prisma.user.findMany({
    where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return profesores.map((p) => ({ id: p.id, nombre: p.name ?? p.email }));
}

// Para el desplegable "Avisar a" del formulario de añadir justificante —
// a diferencia del filtro de arriba, cualquier profesor puede pedir
// esta lista (la necesita al crear un justificante), no solo directivo.
export async function obtenerProfesoresParaAvisar(schoolIdSolicitado: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];
  const schoolId = await resolverSchoolId(schoolIdSolicitado);
  if (!schoolId) return [];

  const profesores = await prisma.user.findMany({
    where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return profesores.map((p) => ({ id: p.id, nombre: p.name ?? p.email }));
}

// Historial de justificantes de un alumno concreto (la "ficha" que se
// abre al elegirlo). Cualquier profesor del centro puede consultarlo —
// el que no sea su tutor ni sea directivo simplemente no verá el botón
// de añadir en el cliente, pero el historial en sí es de solo consulta
// para todos, así que aquí no hace falta bloquear nada más que el
// centro (nunca se cuela el de otro centro).
export async function obtenerHistorialJustificantes(alumnoId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return null;

  const alumno = await prisma.alumno.findUnique({
    where: { id: alumnoId },
    select: {
      id: true,
      nombre: true,
      curso: true,
      avatarUrl: true,
      schoolId: true,
      profesorId: true,
      profesor: { select: { name: true, email: true } },
    },
  });
  if (!alumno) return null;
  if (session.user.role !== "SUPERADMIN" && alumno.schoolId !== session.user.schoolId) return null;

  const justificantes = await prisma.justificanteAsistencia.findMany({
    where: { alumnoId },
    include: {
      creadoPor: { select: { name: true, email: true } },
      avisado: { select: { name: true, email: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return {
    alumno: {
      id: alumno.id,
      nombre: alumno.nombre,
      curso: alumno.curso,
      avatarUrl: alumno.avatarUrl,
      tutorId: alumno.profesorId,
      tutorNombre: alumno.profesor.name ?? alumno.profesor.email,
    },
    puedeAnadir: alumno.profesorId === session.user.id || esDirectivo(session.user.role),
    justificantes: justificantes.map((j) => ({
      id: j.id,
      fecha: j.fecha.toISOString(),
      horaInicio: j.horaInicio,
      horaFin: j.horaFin,
      asignatura: j.asignatura,
      entregado: j.entregado,
      creadoPorNombre: j.creadoPor?.name ?? j.creadoPor?.email ?? "—",
      avisadoId: j.avisadoId,
      avisadoNombre: j.avisado?.name ?? j.avisado?.email ?? null,
    })),
  };
}

// Crea un justificante — solo lo puede hacer el tutor del propio
// alumno, o Dirección/Coordinación/SuperAdmin. El resto de profesores
// solo pueden consultar (ni siquiera deberían ver el botón, pero por si
// acaso se llama a mano, aquí también se rechaza).
export async function crearJustificante(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const alumnoId = (formData.get("alumnoId") as string)?.trim();
  const fechaRaw = (formData.get("fecha") as string)?.trim();
  const horaInicio = (formData.get("horaInicio") as string)?.trim();
  const horaFin = (formData.get("horaFin") as string)?.trim();
  const asignatura = (formData.get("asignatura") as string)?.trim() || null;
  const avisadoId = (formData.get("avisadoId") as string)?.trim() || null;
  const entregado = formData.get("entregado") === "on";

  if (!alumnoId) throw new Error("Falta el alumno.");
  if (!fechaRaw) throw new Error("Falta la fecha.");
  if (!horaInicio || !horaFin) throw new Error("Faltan las horas.");
  if (horaFin <= horaInicio) throw new Error("La hora de fin debe ser posterior a la de inicio.");

  const alumno = await prisma.alumno.findUnique({
    where: { id: alumnoId },
    select: { schoolId: true, profesorId: true, nombre: true },
  });
  if (!alumno) throw new Error("No se ha encontrado el alumno.");
  if (session.user.role !== "SUPERADMIN" && alumno.schoolId !== session.user.schoolId) {
    throw new Error("No se ha encontrado el alumno.");
  }

  const esSuTutor = alumno.profesorId === session.user.id;
  if (!esSuTutor && !esDirectivo(session.user.role)) {
    throw new Error("Solo el tutor del alumno, o Dirección/Coordinación, pueden añadir un justificante.");
  }

  // Si se elige a quién avisar, tiene que ser de verdad un profesor de
  // este mismo centro — nunca de otro.
  let avisado: { id: string; name: string | null; email: string } | null = null;
  if (avisadoId) {
    avisado = await prisma.user.findFirst({
      where: { id: avisadoId, schoolId: alumno.schoolId },
      select: { id: true, name: true, email: true },
    });
    if (!avisado) throw new Error("No se ha encontrado el profesor a avisar.");
  }

  const fecha = new Date(`${fechaRaw}T00:00:00Z`);

  const justificante = await prisma.justificanteAsistencia.create({
    data: {
      schoolId: alumno.schoolId,
      alumnoId,
      fecha,
      horaInicio,
      horaFin,
      asignatura,
      entregado,
      creadoPorId: session.user.id,
      avisadoId: avisado?.id ?? null,
    },
  });

  if (avisado) {
    await notifyUsers([avisado.id], {
      schoolId: alumno.schoolId,
      tipo: "JUSTIFICANTE_ASISTENCIA",
      titulo: "Hora justificada de un alumno",
      mensaje: `${alumno.nombre} tiene ${asignatura ? `su hora de ${asignatura}` : "una hora"} justificada el ${fecha.toLocaleDateString("es-ES")} (${horaInicio}–${horaFin}) — ${entregado ? "justificante entregado" : "todavía sin entregar"}.`,
      link: "/dashboard/justificantes",
      relatedId: justificante.id,
    });

    try {
      await sendJustificanteAvisoEmail({
        to: avisado.email,
        avisadoNombre: avisado.name ?? avisado.email,
        alumnoNombre: alumno.nombre,
        asignatura,
        fecha,
        horaInicio,
        horaFin,
        entregado,
      });
    } catch {
      // Mejor esfuerzo: el justificante ya se ha guardado y la
      // notificación en la app ya ha avisado, aunque falle el email.
    }
  }

  revalidatePath("/dashboard/justificantes");
}

// Edita un justificante ya creado — típicamente para corregir si al
// final se ha entregado o no el justificante, pero se puede cambiar
// cualquier dato. Mismo permiso que para crearlo: el tutor del alumno,
// o Dirección/Coordinación/SuperAdmin. Si queda (o se pone) un profesor
// para avisar, le llega el aviso actualizado — igual que al crearlo.
export async function editarJustificante(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const id = (formData.get("id") as string)?.trim();
  const fechaRaw = (formData.get("fecha") as string)?.trim();
  const horaInicio = (formData.get("horaInicio") as string)?.trim();
  const horaFin = (formData.get("horaFin") as string)?.trim();
  const asignatura = (formData.get("asignatura") as string)?.trim() || null;
  const avisadoId = (formData.get("avisadoId") as string)?.trim() || null;
  const entregado = formData.get("entregado") === "on";

  if (!id) throw new Error("Falta el justificante.");
  if (!fechaRaw) throw new Error("Falta la fecha.");
  if (!horaInicio || !horaFin) throw new Error("Faltan las horas.");
  if (horaFin <= horaInicio) throw new Error("La hora de fin debe ser posterior a la de inicio.");

  const existente = await prisma.justificanteAsistencia.findUnique({
    where: { id },
    select: { schoolId: true, alumno: { select: { profesorId: true, nombre: true } } },
  });
  if (!existente) throw new Error("No se ha encontrado el justificante.");
  if (session.user.role !== "SUPERADMIN" && existente.schoolId !== session.user.schoolId) {
    throw new Error("No autorizado.");
  }

  const esSuTutor = existente.alumno.profesorId === session.user.id;
  if (!esSuTutor && !esDirectivo(session.user.role)) {
    throw new Error("Solo el tutor del alumno, o Dirección/Coordinación, pueden editar este justificante.");
  }

  let avisado: { id: string; name: string | null; email: string } | null = null;
  if (avisadoId) {
    avisado = await prisma.user.findFirst({
      where: { id: avisadoId, schoolId: existente.schoolId },
      select: { id: true, name: true, email: true },
    });
    if (!avisado) throw new Error("No se ha encontrado el profesor a avisar.");
  }

  const fecha = new Date(`${fechaRaw}T00:00:00Z`);

  await prisma.justificanteAsistencia.update({
    where: { id },
    data: { fecha, horaInicio, horaFin, asignatura, entregado, avisadoId: avisado?.id ?? null },
  });

  if (avisado) {
    await notifyUsers([avisado.id], {
      schoolId: existente.schoolId,
      tipo: "JUSTIFICANTE_ASISTENCIA",
      titulo: "Justificante actualizado",
      mensaje: `Se ha actualizado ${asignatura ? `la hora de ${asignatura}` : "una hora"} justificada de ${existente.alumno.nombre} el ${fecha.toLocaleDateString("es-ES")} (${horaInicio}–${horaFin}) — ${entregado ? "justificante entregado" : "todavía sin entregar"}.`,
      link: "/dashboard/justificantes",
      relatedId: id,
    });

    try {
      await sendJustificanteAvisoEmail({
        to: avisado.email,
        avisadoNombre: avisado.name ?? avisado.email,
        alumnoNombre: existente.alumno.nombre,
        asignatura,
        fecha,
        horaInicio,
        horaFin,
        entregado,
        actualizado: true,
      });
    } catch {
      // Mejor esfuerzo, igual que al crearlo.
    }
  }

  revalidatePath("/dashboard/justificantes");
}

// Borra un justificante puesto por error — mismo permiso que para
// crearlo: el tutor del alumno, o Dirección/Coordinación/SuperAdmin.
export async function eliminarJustificante(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const justificante = await prisma.justificanteAsistencia.findUnique({
    where: { id },
    select: { schoolId: true, alumno: { select: { profesorId: true } } },
  });
  if (!justificante) throw new Error("No se ha encontrado el justificante.");
  if (session.user.role !== "SUPERADMIN" && justificante.schoolId !== session.user.schoolId) {
    throw new Error("No autorizado.");
  }

  const esSuTutor = justificante.alumno.profesorId === session.user.id;
  if (!esSuTutor && !esDirectivo(session.user.role)) {
    throw new Error("No tienes permiso para borrar este justificante.");
  }

  await prisma.justificanteAsistencia.delete({ where: { id } });
  revalidatePath("/dashboard/justificantes");
}
