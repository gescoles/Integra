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
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
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

// A diferencia del resto de la gestión del plano (que es solo de
// SuperAdmin), bloquear/desbloquear un aula lo puede hacer también
// Coordinación/Dirección de ese centro.
export async function bloquearAula(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede bloquear un aula.");
  }

  const id = formData.get("id") as string;
  const bloqueada = formData.get("bloqueada") === "true";
  const motivo = (formData.get("motivo") as string)?.trim() || null;

  if (!id) throw new Error("Falta indicar el aula.");

  await prisma.espacioAula.update({
    where: { id },
    data: { bloqueada, motivoBloqueo: bloqueada ? motivo : null },
  });

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

  const aula = await prisma.espacioAula.findUnique({ where: { id: aulaId }, select: { nombre: true, bloqueada: true, motivoBloqueo: true } });
  if (!aula) throw new Error("No se ha encontrado el aula.");
  if (aula.bloqueada) {
    throw new Error(
      aula.motivoBloqueo
        ? `Este espacio está bloqueado y no se puede reservar: ${aula.motivoBloqueo}`
        : "Este espacio está bloqueado y no se puede reservar."
    );
  }

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

  // OJO: siempre en UTC explícito. Si se crea la fecha sin la "Z", Node la
  // interpreta con la zona horaria local del servidor (p. ej. España,
  // UTC+1/+2), y "8 de agosto" se guarda como "7 de agosto" por la noche
  // en UTC — el mismo lío que causaba que las franjas no se vieran bien
  // bloqueadas.
  const fecha = new Date(`${fechaRaw}T00:00:00Z`);
  const hoy = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const limite = new Date(hoy);
  limite.setUTCDate(limite.getUTCDate() + MAX_DIAS_ANTELACION);

  if (fecha < hoy) throw new Error("No puedes reservar para una fecha que ya ha pasado.");
  if (fecha > limite) {
    throw new Error(`Solo se puede reservar con un máximo de ${MAX_DIAS_ANTELACION} días de antelación.`);
  }

  // Si esa aula ya la usa algún profesor a esa hora según el horario
  // lectivo (una clase real, no una hora de guardia), no se puede
  // reservar — el aula solo está libre para reservar cuando ningún
  // horario lectivo la ocupa en esa franja.
  const diaSemana = fecha.getUTCDay() === 0 ? 7 : fecha.getUTCDay();
  const clasesEnEsaAula = await prisma.horarioBloque.findMany({
    where: { aula: aula.nombre, diaSemana, esGuardia: false },
    select: { horaInicio: true, horaFin: true },
  });
  const ocupadaPorHorario = clasesEnEsaAula.some((c) => {
    const cInicio = minutosDesdeMedianoche(c.horaInicio);
    const cFin = minutosDesdeMedianoche(c.horaFin);
    return inicioMin < cFin && finMin > cInicio;
  });
  if (ocupadaPorHorario) {
    throw new Error("Esta aula ya la usa un profesor a esa hora según el horario lectivo. Elige otra franja o otra aula.");
  }

  const reservasDelDia = await prisma.espacioReserva.findMany({ where: { aulaId, fecha } });
  const solapa = reservasDelDia.some((r) => {
    const rInicio = minutosDesdeMedianoche(r.horaInicio);
    const rFin = minutosDesdeMedianoche(r.horaFin);
    return inicioMin < rFin && finMin > rInicio;
  });
  if (solapa) throw new Error("Ese horario ya está reservado. Elige otra franja.");

  // Máximo 3 horas al día por usuario, sumando TODAS sus reservas de ese
  // día en cualquier aula (no solo esta incidencia en concreto).
  const reservasDelUsuarioEseDia = await prisma.espacioReserva.findMany({
    where: { userId, fecha },
    select: { horaInicio: true, horaFin: true },
  });
  const minutosYaReservados = reservasDelUsuarioEseDia.reduce(
    (total, r) => total + (minutosDesdeMedianoche(r.horaFin) - minutosDesdeMedianoche(r.horaInicio)),
    0
  );
  if (minutosYaReservados + (finMin - inicioMin) > MAX_HORAS_RESERVA * 60) {
    throw new Error(`Como mucho puedes reservar ${MAX_HORAS_RESERVA} horas al día en total, entre todos los espacios.`);
  }

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

  const reserva = await prisma.espacioReserva.findUnique({
    where: { id },
    include: {
      aula: { include: { planta: { include: { school: { select: { name: true } } } } } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!reserva) throw new Error("No se ha encontrado la reserva.");

  const puedeEliminar = esDirectivo(session.user.role) || reserva.userId === session.user.id;
  if (!puedeEliminar) throw new Error("Solo puedes eliminar tus propias reservas.");

  await prisma.espacioReserva.delete({ where: { id } });

  // Aviso por email de que la franja ya ha quedado libre otra vez —
  // mismo patrón "mejor esfuerzo" que en crearReserva: si falla el
  // email, la cancelación ya se ha hecho igualmente.
  try {
    const { sendReservaCanceladaEmail } = await import("@/lib/email");
    if (reserva.user.email) {
      await sendReservaCanceladaEmail({
        to: reserva.user.email,
        userNombre: reserva.user.name ?? reserva.user.email,
        aulaNombre: reserva.aula.nombre,
        schoolName: reserva.aula.planta.school.name,
        fecha: reserva.fecha,
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
      });
    }
  } catch {
    // No pasa nada si falla el email; la reserva ya se ha cancelado igualmente.
  }

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
      { plantaId: planta1.id, nombre: "Baño", x: 4, z: 2.3, ancho: 1.3, profundo: 1, color: "#94A3B8", bloqueada: true, motivoBloqueo: "No es un espacio reservable." },
      { plantaId: planta1.id, nombre: "E13", x: 0, z: 2, ancho: 3, profundo: 4.5, color: "#60A5FA" },
      { plantaId: planta1.id, nombre: "E12", x: 4, z: 3.6, ancho: 2.6, profundo: 2.6, color: "#60A5FA" },
      // Planta 0
      { plantaId: planta0.id, nombre: "Sala de tutorías", x: 2, z: 1, ancho: 2.6, profundo: 2.8, color: "#34D399" },
      { plantaId: planta0.id, nombre: "Dirección", x: 5, z: 0.5, ancho: 1.8, profundo: 2.8, color: "#FBBF24", bloqueada: true, motivoBloqueo: "No es un espacio reservable." },
      { plantaId: planta0.id, nombre: "Administración", x: 7.2, z: 0.5, ancho: 1.8, profundo: 2.8, color: "#FBBF24", bloqueada: true, motivoBloqueo: "No es un espacio reservable." },
      { plantaId: planta0.id, nombre: "Teatro", x: 4.5, z: 4.2, ancho: 5.5, profundo: 2.2, color: "#F472B6" },
    ],
  });

  revalidatePath("/dashboard/espacios");
}

// Añade las 5 plantas nuevas (2, 3, 4 y 5) con sus aulas, sin tocar las
// plantas que ya hubiera — a diferencia de sembrarPlanoEjemplo, esta no
// exige que el centro esté vacío, porque es un añadido, no un punto de
// partida desde cero. Cada planta lleva su propio baño, siempre
// bloqueado (no es un espacio reservable), igual que en el plano de
// ejemplo.
export async function sembrarPlantasAdicionales(schoolId: string) {
  await requiereSuperAdmin();

  const yaExiste = await prisma.espacioPlanta.findFirst({
    where: { schoolId, numero: { in: [2, 3, 4, 5] } },
  });
  if (yaExiste) throw new Error("Este centro ya tiene alguna de las plantas 2, 3, 4 o 5 creada; bórrala primero si quieres volver a sembrarla.");

  const definicion: { numero: number; nombre: string; aulas: string[] }[] = [
    { numero: 2, nombre: "Planta 2", aulas: ["E22", "E23", "E24", "E25", "E26", "E27", "E28"] },
    { numero: 3, nombre: "Planta 3", aulas: ["E31", "E33", "E32", "E34"] },
    { numero: 4, nombre: "Planta 4", aulas: ["E41", "E42", "E43"] },
    { numero: 5, nombre: "Planta 5", aulas: ["E51", "E52", "E53"] },
  ];

  for (const p of definicion) {
    const planta = await prisma.espacioPlanta.create({
      data: { schoolId, numero: p.numero, nombre: p.nombre },
    });

    const aulasData = p.aulas.map((nombre, i) => ({
      plantaId: planta.id,
      nombre,
      x: i * 2.5,
      z: 0,
      ancho: 2,
      profundo: 2,
      color: "#60A5FA",
    }));

    // El baño se coloca al final de la fila de aulas de esa planta.
    aulasData.push({
      plantaId: planta.id,
      nombre: "Baño",
      x: p.aulas.length * 2.5,
      z: 0.5,
      ancho: 1.3,
      profundo: 1,
      color: "#94A3B8",
    });

    await prisma.espacioAula.createMany({ data: aulasData });
    await prisma.espacioAula.updateMany({
      where: { plantaId: planta.id, nombre: "Baño" },
      data: { bloqueada: true, motivoBloqueo: "No es un espacio reservable." },
    });
  }

  revalidatePath("/dashboard/espacios");
}
