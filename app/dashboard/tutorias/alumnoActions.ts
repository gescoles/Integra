"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ConQuien, MedioContacto, RiesgoNivel } from "@prisma/client";
import { generateAvatarUrl } from "@/lib/avatar";
import { validarTelefono, validarDocumento, mensajeErrorDocumento } from "@/lib/validacionDocumentos";
import { calcularEdad } from "@/lib/fechas";
import { TipoDocumento } from "@prisma/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Campos de identidad + contacto compartidos entre crear y editar alumno.
function leerCamposAlumno(formData: FormData) {
  const fechaNacimientoRaw = (formData.get("fechaNacimiento") as string)?.trim();
  const tipoDocumento = (formData.get("tipoDocumento") as string)?.trim().toUpperCase() as TipoDocumento;
  const numeroDocumento = (formData.get("numeroDocumento") as string)?.trim();
  const direccion = (formData.get("direccion") as string)?.trim();
  const madreTelefono = (formData.get("madreTelefono") as string)?.trim();
  const madreEmail = (formData.get("madreEmail") as string)?.trim();
  const padreTelefono = (formData.get("padreTelefono") as string)?.trim();
  const padreEmail = (formData.get("padreEmail") as string)?.trim();

  if (!fechaNacimientoRaw) throw new Error("La fecha de nacimiento es obligatoria.");
  const fechaNacimiento = new Date(`${fechaNacimientoRaw}T00:00:00`);
  if (Number.isNaN(fechaNacimiento.getTime())) throw new Error("La fecha de nacimiento no es válida.");
  if (fechaNacimiento > new Date()) throw new Error("La fecha de nacimiento no puede ser una fecha futura.");

  if (tipoDocumento !== "DNI" && tipoDocumento !== "NIE" && tipoDocumento !== "PASAPORTE") {
    throw new Error("Elige el tipo de documento (DNI, NIE o pasaporte).");
  }
  if (!numeroDocumento || !validarDocumento(tipoDocumento, numeroDocumento)) {
    throw new Error(mensajeErrorDocumento(tipoDocumento));
  }

  if (!direccion) throw new Error("La dirección es obligatoria.");

  if (!madreTelefono || !validarTelefono(madreTelefono)) {
    throw new Error("El teléfono de la madre no es válido (9 dígitos para números españoles).");
  }
  if (!madreEmail || !EMAIL_RE.test(madreEmail)) {
    throw new Error("El email de la madre no es válido.");
  }
  if (!padreTelefono || !validarTelefono(padreTelefono)) {
    throw new Error("El teléfono del padre no es válido (9 dígitos para números españoles).");
  }
  if (!padreEmail || !EMAIL_RE.test(padreEmail)) {
    throw new Error("El email del padre no es válido.");
  }

  return {
    fechaNacimiento,
    tipoDocumento,
    numeroDocumento: numeroDocumento.trim().toUpperCase(),
    direccion,
    madreTelefono,
    madreEmail,
    padreTelefono,
    padreEmail,
  };
}

export async function createAlumno(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const nombre = (formData.get("nombre") as string)?.trim();
  const curso = (formData.get("curso") as string)?.trim();
  const riesgo = (formData.get("riesgo") as RiesgoNivel) || "BAJO";
  const departamentoId = (formData.get("departamentoId") as string)?.trim() || null;

  if (!nombre) throw new Error("El nombre del alumno es obligatorio.");
  if (!curso) throw new Error("El curso/grupo es obligatorio.");

  if (departamentoId) {
    const departamento = await prisma.departamento.findUnique({ where: { id: departamentoId } });
    if (!departamento || departamento.schoolId !== session.user.schoolId) throw new Error("El departamento elegido no es válido.");
  }

  const {
    fechaNacimiento,
    tipoDocumento,
    numeroDocumento,
    direccion,
    madreTelefono,
    madreEmail,
    padreTelefono,
    padreEmail,
  } = leerCamposAlumno(formData);

  // La edad nunca se pide a mano — se calcula sola a partir de la fecha
  // de nacimiento, así siempre está bien aunque pase el tiempo.
  const edad = calcularEdad(fechaNacimiento);

  const avatarUrl = generateAvatarUrl(nombre);

  // Equipo directivo puede elegir a qué profesor asignar como tutor; un
  // Profesor siempre se asigna a sí mismo (no puede elegir a otro).
  const esDirectivo =
    session.user.role === "SUPERADMIN" || session.user.role === "DIRECCION" || session.user.role === "COORDINADOR" || session.user.role === "ADMIN_CENTRO" || session.user.role === "ADMINISTRACION";
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
      fechaNacimiento,
      tipoDocumento,
      numeroDocumento,
      direccion,
      departamentoId,
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
    ((session.user.role === "DIRECCION" || session.user.role === "COORDINADOR" || session.user.role === "ADMIN_CENTRO" || session.user.role === "ADMINISTRACION") && alumno?.schoolId === session.user.schoolId);
  if (!alumno || (alumno.profesorId !== session.user.id && !esDirectivo)) {
    throw new Error("No puedes editar un alumno que no es tuyo.");
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const curso = (formData.get("curso") as string)?.trim();
  const riesgo = formData.get("riesgo") as RiesgoNivel;

  if (!nombre) throw new Error("El nombre es obligatorio.");
  if (!curso) throw new Error("El curso/grupo es obligatorio.");

  const {
    fechaNacimiento,
    tipoDocumento,
    numeroDocumento,
    direccion,
    madreTelefono,
    madreEmail,
    padreTelefono,
    padreEmail,
  } = leerCamposAlumno(formData);

  // La edad nunca se pide a mano — se calcula sola a partir de la fecha
  // de nacimiento, así siempre está bien aunque pase el tiempo.
  const edad = calcularEdad(fechaNacimiento);

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
    data: {
      nombre,
      curso,
      edad,
      riesgo,
      fechaNacimiento,
      tipoDocumento,
      numeroDocumento,
      direccion,
      ...(profesorId ? { profesorId } : {}),
    },
  });

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

export async function deleteAlumno(id: string, confirmacionNombre: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const alumno = await prisma.alumno.findUnique({ where: { id } });
  const esDirectivo =
    session.user.role === "SUPERADMIN" ||
    ((session.user.role === "DIRECCION" || session.user.role === "COORDINADOR" || session.user.role === "ADMIN_CENTRO" || session.user.role === "ADMINISTRACION") && alumno?.schoolId === session.user.schoolId);
  // Un profesor solo puede eliminar los alumnos que ha creado/tutoriza él
  // mismo; dirección (Coordinador/Admin. de Centro) puede eliminar
  // cualquier alumno de su centro.
  if (!alumno || (alumno.profesorId !== session.user.id && !esDirectivo)) {
    throw new Error("No puedes eliminar un alumno que no es tuyo.");
  }

  if (confirmacionNombre.trim() !== `Eliminar ${alumno.nombre}`.trim()) {
    throw new Error("El texto escrito no coincide — no se ha eliminado nada.");
  }

  // Se anota en el historial de QUIEN borra (no en el del alumno, que
  // está a punto de desaparecer con todo lo suyo) — así queda constancia
  // de quién ha borrado a qué alumno, con fecha y hora, aunque el
  // alumno ya no exista.
  try {
    await prisma.userHistorial.create({
      data: {
        userId: session.user.id,
        accion: "alumno_eliminado",
        detalle: `Eliminó al alumno/a "${alumno.nombre}" (${alumno.curso}), con todo lo relacionado (tutorías, prácticas, incidencias, PI...).`,
        hechoPorId: session.user.id,
        hechoPorNombre: session.user.name ?? session.user.email,
      },
    });
  } catch (e) {
    console.error("No se pudo anotar el historial de eliminación del alumno:", e);
  }

  // Con las cascadas de la base de datos, borrar el alumno ya se lleva
  // por delante todo lo suyo (tutorías, contactos, prácticas,
  // incidencias, expedientes, PI y su historial) sin dejar nada huérfano.
  await prisma.alumno.delete({ where: { id } });

  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/mis-alumnos");
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard");
}

export async function obtenerDepartamentosParaAlumno() {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return [];
  const departamentos = await prisma.departamento.findMany({
    where: { schoolId: session.user.schoolId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return departamentos;
}
