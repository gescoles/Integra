"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ConQuien, MedioContacto, RiesgoNivel } from "@prisma/client";
import { generateAvatarUrl } from "@/lib/avatar";

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

  const avatarUrl = generateAvatarUrl(nombre);

  const alumno = await prisma.alumno.create({
    data: {
      schoolId: session.user.schoolId,
      profesorId: session.user.id,
      nombre,
      curso,
      edad: edadRaw ? Number(edadRaw) : null,
      riesgo,
      avatarUrl,
    },
  });

  const contactos = [];
  if (madreTelefono || madreEmail) {
    contactos.push({ alumnoId: alumno.id, relacion: "Madre", telefono: madreTelefono || null, email: madreEmail || null });
  }
  if (padreTelefono || padreEmail) {
    contactos.push({ alumnoId: alumno.id, relacion: "Padre", telefono: padreTelefono || null, email: padreEmail || null });
  }
  if (contactos.length > 0) {
    await prisma.alumnoContacto.createMany({ data: contactos });
  }

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

  await prisma.alumno.update({
    where: { id },
    data: { nombre, curso, edad: edadRaw ? Number(edadRaw) : null, riesgo },
  });

  const madreTelefono = (formData.get("madreTelefono") as string)?.trim();
  const madreEmail = (formData.get("madreEmail") as string)?.trim();
  const padreTelefono = (formData.get("padreTelefono") as string)?.trim();
  const padreEmail = (formData.get("padreEmail") as string)?.trim();

  await prisma.alumnoContacto.deleteMany({ where: { alumnoId: id } });
  const contactos = [];
  if (madreTelefono || madreEmail) {
    contactos.push({ alumnoId: id, relacion: "Madre", telefono: madreTelefono || null, email: madreEmail || null });
  }
  if (padreTelefono || padreEmail) {
    contactos.push({ alumnoId: id, relacion: "Padre", telefono: padreTelefono || null, email: padreEmail || null });
  }
  if (contactos.length > 0) {
    await prisma.alumnoContacto.createMany({ data: contactos });
  }

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
