"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const HORA_APERTURA = "08:00";
const HORA_CIERRE = "18:30";
const MAX_HORAS_RESERVA = 3;
const MAX_DIAS_ANTELACION = 7;

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO";
}

function minutosDesdeMedianoche(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

async function requiereSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || session.user.role !== "SUPERADMIN") {
    throw new Error("Solo SuperAdmin puede editar el plano del centro.");
  }
  return session;
}

// ------------------- Gestión del plano (SuperAdmin) -------------------

export async function crearPlanta(formData: FormData) {
  await requiereSuperAdmin();
  const schoolId = formData.get("schoolId") as string;
  const numero = Number(formData.get("numero"));
  const nombre = (formData.get("nombre") as string)?.trim();

  if (!schoolId) throw new Error("Falta indicar el centro.");
  if (Number.isNaN(numero)) throw new Error("Indica el número de planta.");
  if (!nombre) throw new Error("Indica el nombre de la planta.");

  await prisma.espacioPlanta.create({ data: { schoolId, numero, nombre } });
  revalidatePath("/dashboard/espacios");
}

export async function eliminarPlanta(id: string) {
  await requiereSuperAdmin();
  await prisma.espacioPlanta.delete({ where: { id } });
  revalidatePath("/dashboard/espacios");
}

export async function crearAula(formData: FormData) {
  await requiereSuperAdmin();
  const plantaId = formData.get("plantaId") as string;
  const nombre = (formData.get("nombre") as string)?.trim();
  const x = Number(formData.get("x"));
  const z = Number(formData.get("z"));
  const ancho = Number(formData.get("ancho"));
  const profundo = Number(formData.get("profundo"));
  const alto = Number(formData.get("alto")) || 2.5;
  const color = (formData.get("color") as string) || "#94A3B8";

  if (!plantaId) throw new Error("Falta indicar la planta.");
  if (!nombre) throw new Error("Indica el nombre del aula.");
  if ([x, z, ancho, profundo].some((v) => Number.isNaN(v))) throw new Error("Revisa la posición y el tamaño del aula.");
  if (ancho <= 0 || profundo <= 0) throw new Error("El ancho y el fondo deben ser mayores que 0.");

  await prisma.espacioAula.create({ data: { plantaId, nombre, x, z, ancho, profundo, alto, color } });
  revalidatePath("/dashboard/espacios");
}

export async function actualizarAula(formData: FormData) {
  await requiereSuperAdmin();
  const id = formData.get("id") as string;
  const nombre = (formData.get("nombre") as string)?.trim();
  const x = Number(formData.get("x"));
  const z = Number(formData.get("z"));
  const ancho = Number(formData.get("ancho"));
  const profundo = Number(formData.get("profundo"));
  const alto = Number(formData.get("alto")) || 2.5;
  const color = (formData.get("color") as string) || "#94A3B8";

  if (!nombre) throw new Error("Indica el nombre del aula.");
  if ([x, z, ancho, profundo].some((v) => Number.isNaN(v))) throw new Error("Revisa la posición y el tamaño del aula.");

  await prisma.espacioAula.update({ where: { id }, data: { nombre, x, z, ancho, profundo, alto, color } });
  revalidatePath("/dashboard/espacios");
}

export async function eliminarAula(id: string) {
  await requiereSuperAdmin();
  await prisma.espacioAula.delete({ where: { id } });
  revalidatePath("/dashboard/espacios");
}

// ------------------- Reservas -------------------

export async function crearReserva(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const aulaId = formData.get("aulaId") as string;
  const fechaRaw = formData.get("fecha") as string;
  const horaInicio = formData.get("horaInicio") as string;
  const horaFin = formData.get("horaFin") as string;
  const userIdSolicitado = formData.get("userId") as string | null;

  if (!aulaId || !fechaRaw || !horaInicio || !horaFin) throw new Error("Faltan datos de la reserva.");

  const userId = userIdSolicitado && esDirectivo(session.user.role) ? userIdSolicitado : session.user.id;

  const inicioMin = minutosDesdeMedianoche(horaInicio);
  const finMin = minutosDesdeMedianoche(horaFin);

  if (finMin <= inicioMin) throw new Error("La hora de fin tiene que ser posterior a la de inicio.");
  if (inicioMin < minutosDesdeMedianoche(HORA_APERTURA) || finMin > minutosDesdeMedianoche(HORA_CIERRE)) {
    throw new Error(`El centro solo abre de ${HORA_APERTURA} a ${HORA_CIERRE}. Elige un horario dentro de ese rango.`);
  }
  if (finMin - inicioMin > MAX_HORAS_RESERVA * 60) {
    throw new Error(`Como mucho se pueden reservar ${MAX_HORAS_RESERVA} horas seguidas.`);
  }

  const fecha = new Date(`${fechaRaw}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + MAX_DIAS_ANTELACION);

  if (fecha < hoy) throw new Error("No puedes reservar para una fecha que ya ha pasado.");
  if (fecha > limite) {
    throw new Error(`Solo se puede reservar con un máximo de ${MAX_DIAS_ANTELACION} días de antelación.`);
  }

  const reservasDelDia = await prisma.espacioReserva.findMany({ where: { aulaId, fecha } });
  const solapa = reservasDelDia.some((r) => {
    const rInicio = minutosDesdeMedianoche(r.horaInicio);
    const rFin = minutosDesdeMedianoche(r.horaFin);
    return inicioMin < rFin && finMin > rInicio;
  });
  if (solapa) throw new Error("Ese horario ya está reservado. Elige otra franja.");

  const reserva = await prisma.espacioReserva.create({
    data: { aulaId, userId, creadoPorId: session.user.id, fecha, horaInicio, horaFin },
    include: {
      aula: { include: { planta: { include: { school: { select: { name: true } } } } } },
      user: { select: { name: true, email: true } },
    },
  });

  // Aviso por email al usuario de la reserva (mejor esfuerzo: si el email
  // falla, la reserva ya ha quedado guardada igualmente).
  try {
    const { sendReservaConfirmadaEmail } = await import("@/lib/email");
    if (reserva.user.email) {
      await sendReservaConfirmadaEmail({
        to: reserva.user.email,
        userNombre: reserva.user.name ?? reserva.user.email,
        aulaNombre: reserva.aula.nombre,
        schoolName: reserva.aula.planta.school.name,
        fecha,
        horaInicio,
        horaFin,
      });
    }
  } catch {
    // No pasa nada si falla el email; la reserva ya está guardada.
  }

  revalidatePath("/dashboard/espacios");
}

export async function eliminarReserva(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const reserva = await prisma.espacioReserva.findUnique({ where: { id } });
  if (!reserva) throw new Error("No se ha encontrado la reserva.");

  const puedeEliminar = esDirectivo(session.user.role) || reserva.userId === session.user.id;
  if (!puedeEliminar) throw new Error("Solo puedes eliminar tus propias reservas.");

  await prisma.espacioReserva.delete({ where: { id } });
  revalidatePath("/dashboard/espacios");
}

// Atajo para dar de alta de un solo clic el plano de ejemplo dibujado a
// mano para iMES (Planta 0 y Planta 1), en vez de tener que crear cada
// aula una por una desde el formulario.
export async function sembrarPlanoEjemplo(schoolId: string) {
  await requiereSuperAdmin();

  const existentes = await prisma.espacioPlanta.count({ where: { schoolId } });
  if (existentes > 0) throw new Error("Este centro ya tiene plantas creadas; bórralas primero si quieres volver a empezar.");

  const planta1 = await prisma.espacioPlanta.create({
    data: { schoolId, numero: 1, nombre: "Planta 1" },
  });
  const planta0 = await prisma.espacioPlanta.create({
    data: { schoolId, numero: 0, nombre: "Planta 0" },
  });

  await prisma.espacioAula.createMany({
    data: [
      // Planta 1
      { plantaId: planta1.id, nombre: "E11", x: 4, z: 0, ancho: 2, profundo: 2, color: "#60A5FA" },
      { plantaId: planta1.id, nombre: "Baño", x: 4, z: 2.3, ancho: 1.3, profundo: 1, color: "#94A3B8" },
      { plantaId: planta1.id, nombre: "E13", x: 0, z: 2, ancho: 3, profundo: 4.5, color: "#60A5FA" },
      { plantaId: planta1.id, nombre: "E12", x: 4, z: 3.6, ancho: 2.6, profundo: 2.6, color: "#60A5FA" },
      // Planta 0
      { plantaId: planta0.id, nombre: "Sala de tutorías", x: 2, z: 1, ancho: 1.2, profundo: 2.8, color: "#34D399" },
      { plantaId: planta0.id, nombre: "Dirección", x: 5, z: 0.5, ancho: 1.8, profundo: 2.8, color: "#FBBF24" },
      { plantaId: planta0.id, nombre: "Administración", x: 7.2, z: 0.5, ancho: 1.8, profundo: 2.8, color: "#FBBF24" },
      { plantaId: planta0.id, nombre: "Teatro", x: 4.5, z: 4.2, ancho: 5.5, profundo: 2.2, color: "#F472B6" },
    ],
  });

  revalidatePath("/dashboard/espacios");
}
