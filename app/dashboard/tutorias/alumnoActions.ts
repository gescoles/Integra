"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ConQuien, MedioContacto, RiesgoNivel } from "@prisma/client";
import { generateAvatarUrl } from "@/lib/avatar";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_RE = /^\+\d{1,4} \d{6,12}$/;

export async function createAlumno(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const nombre = (formData.get("nombre") as string)?.trim();
  const curso = (formData.get("curso") as string)?.trim();
  const edadRaw = formData.get("edad") as string;
  const riesgo = (formData.get("riesgo") as RiesgoNivel) || "BAJO";

  const madreTelefono = (formData.get("madreTelefono") as string)?.trim();
  const madreEmail = (formData.get("madreEmail") as string)?.trim();
  const padreTelefono = (formData.get("padreTelefono") as string)?.trim();
  const padreEmail = (formData.get("padreEmail") as string)?.trim();

  if (!nombre) throw new Error("El nombre del alumno es obligatorio.");
  if (!curso) throw new Error("El curso/grupo es obligatorio.");
  if (!edadRaw) throw new Error("La edad es obligatoria.");

  const edad = Number(edadRaw);
  if (!Number.isInteger(edad) || edad < 0 || edad > 99) throw new Error("La edad no es válida.");

  if (!madreTelefono || !TELEFONO_RE.test(madreTelefono)) {
    throw new Error("El teléfono de la madre no es válido.");
  }
  if (!madreEmail || !EMAIL_RE.test(madreEmail)) {
    throw new Error("El email de la madre no es válido.");
  }
  if (!padreTelefono || !TELEFONO_RE.test(padreTelefono)) {
    throw new Error("El teléfono del padre no es válido.");
  }
  if (!padreEmail || !EMAIL_RE.test(padreEmail)) {
    throw new Error("El email del padre no es válido.");
  }

  const avatarUrl = generateAvatarUrl(nombre);

  // Equipo directivo puede elegir a qué profesor asignar como tutor; un
  // Profesor siempre se asigna a sí mismo (no puede elegir a otro).
  const esDirectivo =
    session.user.role === "SUPERADMIN" || session.user.role === "COORDINADOR" || session.user.role === "ADMIN_CENTRO";
  const tutorIdElegido = (formData.get("tutorId") as string)?.trim();
  let profesorId = session.user.id;
  if (esDirectivo && tutorIdElegido) {
    const tutor = await prisma.user.findUnique({ where: { id: tutorIdElegido } });
    if (!tutor || tutor.schoolId !== session.user.schoolId) {
      throw new Error("El tutor elegido no es válido.");
    }
    profesorId = tutorIdElegido;
  }

  const alumno = await prisma.alumno.create({
    data: {
      schoolId: session.user.schoolId,
      profesorId,
      nombre,
      curso,
      edad,
      riesgo,
      avatarUrl,
    },
  });

  await prisma.alumnoContacto.createMany({
    data: [
      { alumnoId: alumno.id, relacion: "Madre", telefono: madreTelefono, email: madreEmail },
      { alumnoId: alumno.id, relacion: "Padre", telefono: padreTelefono, email: padreEmail },
    ],
  });

  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/mis-alumnos");
  return alumno.id;
}

export async function updateAlumnoFicha(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const id = formData.get("id") as string;
  const alumno = await prisma.alumno.findUnique({ where: { id } });
  const esDirectivo =
    session.user.role === "SUPERADMIN" ||
    ((session.user.role === "COORDINADOR" || session.user.role === "ADMIN_CENTRO") && alumno?.schoolId === session.user.schoolId);
  if (!alumno || (alumno.profesorId !== session.user.id && !esDirectivo)) {
    throw new Error("No puedes editar un alumno que no es tuyo.");
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const curso = (formData.get("curso") as string)?.trim();
  const edadRaw = formData.get("edad") as string;
  const riesgo = formData.get("riesgo") as RiesgoNivel;

  if (!nombre) throw new Error("El nombre es obligatorio.");
  if (!curso) throw new Error("El curso/grupo es obligatorio.");
  if (!edadRaw) throw new Error("La edad es obligatoria.");

  const edad = Number(edadRaw);
  if (!Number.isInteger(edad) || edad < 0 || edad > 99) throw new Error("La edad no es válida.");

  // Solo equipo directivo puede reasignar el tutor de un alumno.
  const tutorIdElegido = (formData.get("tutorId") as string)?.trim();
  let profesorId: string | undefined;
  if (esDirectivo && tutorIdElegido && tutorIdElegido !== alumno.profesorId) {
    const tutor = await prisma.user.findUnique({ where: { id: tutorIdElegido } });
    if (!tutor || tutor.schoolId !== alumno.schoolId) throw new Error("El tutor elegido no es válido.");
    profesorId = tutorIdElegido;
  }

  await prisma.alumno.update({
    where: { id },
    data: { nombre, curso, edad, riesgo, ...(profesorId ? { profesorId } : {}) },
  });

  const madreTelefono = (formData.get("madreTelefono") as string)?.trim();
  const madreEmail = (formData.get("madreEmail") as string)?.trim();
  const padreTelefono = (formData.get("padreTelefono") as string)?.trim();
  const padreEmail = (formData.get("padreEmail") as string)?.trim();

  if (!madreTelefono || !TELEFONO_RE.test(madreTelefono)) {
    throw new Error("El teléfono de la madre no es válido.");
  }
  if (!madreEmail || !EMAIL_RE.test(madreEmail)) {
    throw new Error("El email de la madre no es válido.");
  }
  if (!padreTelefono || !TELEFONO_RE.test(padreTelefono)) {
    throw new Error("El teléfono del padre no es válido.");
  }
  if (!padreEmail || !EMAIL_RE.test(padreEmail)) {
    throw new Error("El email del padre no es válido.");
  }

  await prisma.alumnoContacto.deleteMany({ where: { alumnoId: id } });
  await prisma.alumnoContacto.createMany({
    data: [
      { alumnoId: id, relacion: "Madre", telefono: madreTelefono, email: madreEmail },
      { alumnoId: id, relacion: "Padre", telefono: padreTelefono, email: padreEmail },
    ],
  });

  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/mis-alumnos");
}

export async function createTutoriaAlumno(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const alumnoId = formData.get("alumnoId") as string;
  const fecha = formData.get("fecha") as string;
  const hora = formData.get("hora") as string;
  const conQuien = formData.get("conQuien") as ConQuien;
  const medio = formData.get("medio") as MedioContacto;
  const causa = (formData.get("causa") as string)?.trim();

  if (!alumnoId) throw new Error("Falta el alumno.");
  if (!fecha || !hora) throw new Error("Indica la fecha y la hora.");
  if (!causa) throw new Error("Indica la causa de la tutoría.");

  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId } });
  if (!alumno) throw new Error("Alumno no encontrado.");

  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  const sessionDate = new Date(y, m - 1, d, hh, mm);

  await prisma.tutoria.create({
    data: {
      schoolId: session.user.schoolId,
      profesorId: session.user.id,
      alumnoId,
      studentName: alumno.nombre,
      cicloModulo: alumno.curso,
      sessionDate,
      conQuien,
      medio,
      causa,
      status: "PENDIENTE",
    },
  });

  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard");
}

export async function updateTutoriaAlumno(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const id = formData.get("id") as string;
  const tutoria = await prisma.tutoria.findUnique({ where: { id } });
  if (!tutoria || (tutoria.profesorId !== session.user.id && session.user.role !== "SUPERADMIN")) {
    throw new Error("No puedes modificar una tutoría que no es tuya.");
  }
  if (tutoria.status === "COMPLETADA") {
    throw new Error("Esta tutoría ya está cerrada y no se puede modificar.");
  }

  const fecha = formData.get("fecha") as string;
  const hora = formData.get("hora") as string;
  const conQuien = formData.get("conQuien") as ConQuien;
  const medio = formData.get("medio") as MedioContacto;
  const causa = (formData.get("causa") as string)?.trim();

  if (!fecha || !hora) throw new Error("Indica la fecha y la hora.");
  if (!causa) throw new Error("Indica la causa de la tutoría.");

  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  const sessionDate = new Date(y, m - 1, d, hh, mm);

  await prisma.tutoria.update({
    where: { id },
    data: { sessionDate, conQuien, medio, causa },
  });

  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard");
}

export async function cerrarTutoria(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const id = formData.get("id") as string;
  const tutoria = await prisma.tutoria.findUnique({ where: { id } });
  if (!tutoria || (tutoria.profesorId !== session.user.id && session.user.role !== "SUPERADMIN")) {
    throw new Error("No puedes cerrar una tutoría que no es tuya.");
  }
  if (tutoria.status === "COMPLETADA") {
    throw new Error("Esta tutoría ya está cerrada y no se puede modificar.");
  }

  const notas = (formData.get("notas") as string)?.trim();
  const proximoSeguimientoRaw = formData.get("proximoSeguimiento") as string;

  if (!notas) throw new Error("Escribe un resumen de lo tratado en la sesión.");

  let proximoSeguimiento: Date | null = null;
  if (proximoSeguimientoRaw) {
    proximoSeguimiento = new Date(`${proximoSeguimientoRaw}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (proximoSeguimiento < hoy) {
      throw new Error("El próximo seguimiento no puede ser una fecha anterior a hoy.");
    }
  }

  await prisma.tutoria.update({
    where: { id },
    data: { notas, proximoSeguimiento, status: "COMPLETADA" },
  });

  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard");
}

export async function deleteTutoriaAlumno(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const tutoria = await prisma.tutoria.findUnique({ where: { id } });
  if (!tutoria || (tutoria.profesorId !== session.user.id && session.user.role !== "SUPERADMIN")) {
    throw new Error("No puedes eliminar una tutoría que no es tuya.");
  }

  await prisma.tutoria.delete({ where: { id } });
  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard");
}

export async function deleteAlumno(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const alumno = await prisma.alumno.findUnique({ where: { id } });
  const esDirectivo =
    session.user.role === "SUPERADMIN" ||
    ((session.user.role === "COORDINADOR" || session.user.role === "ADMIN_CENTRO") && alumno?.schoolId === session.user.schoolId);
  // Un profesor solo puede eliminar los alumnos que ha creado/tutoriza él
  // mismo; dirección (Coordinador/Admin. de Centro) puede eliminar
  // cualquier alumno de su centro.
  if (!alumno || (alumno.profesorId !== session.user.id && !esDirectivo)) {
    throw new Error("No puedes eliminar un alumno que no es tuyo.");
  }

  // Se borran también TODAS sus tutorías (a propósito, con confirmación explícita en la interfaz)
  await prisma.tutoria.deleteMany({ where: { alumnoId: id } });
  await prisma.alumnoContacto.deleteMany({ where: { alumnoId: id } });
  await prisma.alumno.delete({ where: { id } });

  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/mis-alumnos");
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard");
}
