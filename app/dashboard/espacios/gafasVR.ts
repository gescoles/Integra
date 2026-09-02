"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Mismo horario de apertura y mismo límite de horas seguidas que Reserva
// de Espacios, tal como se pidió — pero deliberadamente SIN comprobar el
// horario lectivo del profesor (las gafas no tienen nada que ver con el
// calendario de clases).
const HORA_APERTURA = "08:00";
const HORA_CIERRE = "18:30";
const MAX_HORAS_RESERVA = 3;
const MAX_DIAS_ANTELACION = 7;

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

function minutosDesdeMedianoche(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

async function requiereSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") throw new Error("Solo el SuperAdmin puede hacer esto.");
  return session;
}

// El SuperAdmin elige quién es el TIC del centro, entre los profesores
// de ese centro.
export async function asignarTicCentro(schoolId: string, userId: string | null) {
  await requiereSuperAdmin();

  if (userId) {
    const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { schoolId: true } });
    if (!usuario || usuario.schoolId !== schoolId) throw new Error("Ese profesor no pertenece a este centro.");
  }

  await prisma.school.update({ where: { id: schoolId }, data: { ticUserId: userId } });
  revalidatePath("/dashboard/espacios");
}

export async function obtenerTicDelCentro(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { ticUserId: true, tic: { select: { id: true, name: true, email: true } } },
  });
  return school?.tic ? { id: school.tic.id, nombre: school.tic.name ?? school.tic.email } : null;
}

export async function obtenerProfesoresParaTic(schoolId: string) {
  const profesores = await prisma.user.findMany({
    where: { schoolId, status: "ACTIVO" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  return profesores.map((p) => ({ id: p.id, nombre: p.name ?? p.email, role: p.role }));
}

// Crear una reserva de las gafas — misma lógica de horario/solapamiento
// que Reserva de Espacios, pero SIN mirar el horario lectivo del
// profesor, y sin depender de ningún aula/planta (las gafas son un
// único recurso compartido por todo el centro).
export async function crearReservaGafasVR(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const fechaRaw = formData.get("fecha") as string;
  const horaInicio = formData.get("horaInicio") as string;
  const horaFin = formData.get("horaFin") as string;
  if (!fechaRaw || !horaInicio || !horaFin) throw new Error("Faltan datos de la reserva.");

  const inicioMin = minutosDesdeMedianoche(horaInicio);
  const finMin = minutosDesdeMedianoche(horaFin);

  if (finMin <= inicioMin) throw new Error("La hora de fin tiene que ser posterior a la de inicio.");
  if (inicioMin < minutosDesdeMedianoche(HORA_APERTURA) || finMin > minutosDesdeMedianoche(HORA_CIERRE)) {
    throw new Error(`El centro solo abre de ${HORA_APERTURA} a ${HORA_CIERRE}. Elige un horario dentro de ese rango.`);
  }
  if (finMin - inicioMin > MAX_HORAS_RESERVA * 60) {
    throw new Error(`Como mucho se pueden reservar ${MAX_HORAS_RESERVA} horas seguidas.`);
  }

  // Mismo cuidado con las zonas horarias que en Espacios: siempre en UTC
  // explícito, para que la fecha no se corra un día por la zona horaria
  // del servidor.
  const fecha = new Date(`${fechaRaw}T00:00:00Z`);
  const hoy = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const limite = new Date(hoy);
  limite.setUTCDate(limite.getUTCDate() + MAX_DIAS_ANTELACION);

  if (fecha < hoy) throw new Error("No puedes reservar para una fecha que ya ha pasado.");
  if (fecha > limite) {
    throw new Error(`Solo se puede reservar con un máximo de ${MAX_DIAS_ANTELACION} días de antelación.`);
  }
  if (fecha.getTime() === hoy.getTime()) {
    const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    if (inicioMin < ahoraMin) throw new Error("No puedes reservar una hora que ya ha pasado.");
  }

  // Todo dentro de una transacción: comprobar el solapamiento y crear la
  // reserva de un tirón, para que dos peticiones casi simultáneas (un
  // doble clic accidental, por ejemplo) no puedan colarse las dos a la
  // vez antes de que la primera quede confirmada.
  const reserva = await prisma.$transaction(async (tx) => {
    const reservasDelDia = await tx.gafasVRReserva.findMany({
      where: { schoolId: session.user.schoolId as string, fecha, estado: "RESERVADA" },
    });
    const solapa = reservasDelDia.some((r) => {
      const rInicio = minutosDesdeMedianoche(r.horaInicio);
      const rFin = minutosDesdeMedianoche(r.horaFin);
      return inicioMin < rFin && finMin > rInicio;
    });
    if (solapa) throw new Error("Las gafas ya están reservadas en esa franja. Elige otra hora.");

    return tx.gafasVRReserva.create({
      data: { schoolId: session.user.schoolId as string, userId: session.user.id as string, fecha, horaInicio, horaFin },
    });
  });

  const [usuario, school] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
    prisma.school.findUnique({ where: { id: session.user.schoolId }, select: { name: true, ticUserId: true, tic: { select: { name: true, email: true } } } }),
  ]);

  // Mejor esfuerzo: si fallan los correos, la reserva ya se ha hecho
  // igualmente.
  try {
    if (usuario?.email) {
      const { sendGafasVRReservadaEmail } = await import("@/lib/email");
      await sendGafasVRReservadaEmail({
        to: usuario.email,
        nombre: usuario.name ?? usuario.email,
        fecha,
        horaInicio,
        horaFin,
      });
    }
  } catch (e) {
    console.error("No se pudo enviar el correo de reserva de gafas VR:", e);
  }

  try {
    if (school?.ticUserId) {
      await prisma.notificacion.create({
        data: {
          userId: school.ticUserId,
          schoolId: session.user.schoolId,
          tipo: "gafas_vr_reservadas",
          titulo: "Nueva reserva de las gafas de RV",
          mensaje: `${usuario?.name ?? usuario?.email ?? "Alguien"} ha reservado las gafas de RV para el ${fecha.toLocaleDateString("es-ES")}, de ${horaInicio} a ${horaFin}.`,
          link: "/dashboard/espacios",
          relatedId: reserva.id,
        },
      });
    }
  } catch (e) {
    console.error("No se pudo crear la notificación al TIC de la reserva de gafas VR:", e);
  }

  try {
    if (school?.tic?.email) {
      const { sendGafasVRAvisoTicEmail } = await import("@/lib/email");
      await sendGafasVRAvisoTicEmail({
        to: school.tic.email,
        ticNombre: school.tic.name ?? school.tic.email,
        reservanteNombre: usuario?.name ?? usuario?.email ?? "Alguien",
        fecha,
        horaInicio,
        horaFin,
      });
    }
  } catch (e) {
    console.error("No se pudo avisar al TIC de la reserva de gafas VR:", e);
  }

  revalidatePath("/dashboard/espacios");
  return reserva.id;
}

export async function eliminarReservaGafasVR(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const reserva = await prisma.gafasVRReserva.findUnique({ where: { id } });
  if (!reserva) throw new Error("No se ha encontrado la reserva.");
  if (reserva.userId !== session.user.id && !esDirectivo(session.user.role)) {
    throw new Error("Solo puedes cancelar tus propias reservas.");
  }

  await prisma.gafasVRReserva.delete({ where: { id } });
  revalidatePath("/dashboard/espacios");
}

// El TIC (o un directivo) marca las gafas como devueltas.
export async function marcarGafasDevueltas(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const reserva = await prisma.gafasVRReserva.findUnique({
    where: { id },
    include: { school: { select: { ticUserId: true } }, user: { select: { name: true, email: true } } },
  });
  if (!reserva) throw new Error("No se ha encontrado la reserva.");

  // Exclusivo del TIC del centro — ni siquiera Coordinación/Administración
  // pueden marcar esto, tal como se pidió.
  const esTic = reserva.school.ticUserId === session.user.id;
  if (!esTic) {
    throw new Error("Solo el TIC del centro puede marcar esto.");
  }

  await prisma.gafasVRReserva.update({
    where: { id },
    data: { estado: "DEVUELTA", devueltoEn: new Date() },
  });

  try {
    if (reserva.user.email) {
      const { sendGafasVRDevueltaGraciasEmail } = await import("@/lib/email");
      await sendGafasVRDevueltaGraciasEmail({
        to: reserva.user.email,
        nombre: reserva.user.name ?? reserva.user.email,
      });
    }
  } catch (e) {
    console.error("No se pudo enviar el correo de agradecimiento de gafas VR:", e);
  }

  revalidatePath("/dashboard/espacios");
}

// El TIC puede deshacer la marca de "devuelto" si se equivocó, y vuelve
// a quedar pendiente (en rojo) — con su propio aviso al profesor.
export async function desmarcarGafasDevueltas(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const reserva = await prisma.gafasVRReserva.findUnique({
    where: { id },
    include: { school: { select: { ticUserId: true } }, user: { select: { name: true, email: true } } },
  });
  if (!reserva) throw new Error("No se ha encontrado la reserva.");

  const esTic = reserva.school.ticUserId === session.user.id;
  if (!esTic) {
    throw new Error("Solo el TIC del centro puede editar esto.");
  }

  await prisma.gafasVRReserva.update({
    where: { id },
    data: { estado: "RESERVADA", devueltoEn: null },
  });

  try {
    if (reserva.user.email) {
      const { sendGafasVRRecordatorioPendienteEmail } = await import("@/lib/email");
      await sendGafasVRRecordatorioPendienteEmail({
        to: reserva.user.email,
        nombre: reserva.user.name ?? reserva.user.email,
      });
    }
  } catch (e) {
    console.error("No se pudo enviar el correo de recordatorio de gafas VR:", e);
  }

  revalidatePath("/dashboard/espacios");
}

// Todas las reservas del centro — para el TIC y para los roles
// directivos, que necesitan ver el conjunto completo, no solo las suyas.
export async function obtenerReservasGafasVR(schoolId: string) {
  const reservas = await prisma.gafasVRReserva.findMany({
    where: { schoolId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ fecha: "desc" }, { horaInicio: "asc" }],
  });
  return reservas.map((r) => ({
    id: r.id,
    userNombre: r.user.name ?? r.user.email,
    userId: r.userId,
    fecha: r.fecha.toISOString(),
    horaInicio: r.horaInicio,
    horaFin: r.horaFin,
    estado: r.estado,
    devueltoEn: r.devueltoEn ? r.devueltoEn.toISOString() : null,
  }));
}

// Se llama desde un cron: revisa todas las reservas de gafas que ya
// deberían haberse devuelto (más de 1 hora después de su hora de fin) y
// que todavía no se han marcado como devueltas — avisa al TIC de cada
// centro por correo y con una notificación dentro de la app, una sola
// vez por reserva (por eso se marca recordatorioEnviado).
export async function enviarRecordatoriosGafasNoDevueltas() {
  const ahora = new Date();

  const pendientes = await prisma.gafasVRReserva.findMany({
    where: { estado: "RESERVADA", recordatorioEnviado: false },
    include: {
      user: { select: { name: true, email: true } },
      school: { select: { ticUserId: true, tic: { select: { name: true, email: true } } } },
    },
  });

  let avisados = 0;

  for (const r of pendientes) {
    const [h, m] = r.horaFin.split(":").map(Number);
    const finPrevisto = new Date(r.fecha);
    finPrevisto.setHours(h, m, 0, 0);
    const unaHoraDespues = new Date(finPrevisto.getTime() + 60 * 60 * 1000);

    if (ahora < unaHoraDespues) continue; // todavía no ha pasado la hora de margen

    const reservanteNombre = r.user.name ?? r.user.email;

    try {
      if (r.school.tic?.email) {
        const { sendGafasVRNoDevueltaEmail } = await import("@/lib/email");
        await sendGafasVRNoDevueltaEmail({
          to: r.school.tic.email,
          ticNombre: r.school.tic.name ?? r.school.tic.email,
          reservanteNombre,
          fecha: r.fecha,
          horaInicio: r.horaInicio,
          horaFin: r.horaFin,
        });
      }
    } catch (e) {
      console.error("No se pudo enviar el recordatorio de gafas VR no devueltas:", e);
    }

    try {
      if (r.school.ticUserId) {
        await prisma.notificacion.create({
          data: {
            userId: r.school.ticUserId,
            schoolId: r.schoolId,
            tipo: "gafas_vr_no_devueltas",
            titulo: "Gafas de RV sin devolver",
            mensaje: `${reservanteNombre} todavía no ha devuelto las gafas de RV — por favor, ponte en contacto con ella por los canales oficiales.`,
            link: "/dashboard/espacios",
            relatedId: r.id,
          },
        });
      }
    } catch (e) {
      console.error("No se pudo crear la notificación de gafas VR no devueltas:", e);
    }

    await prisma.gafasVRReserva.update({ where: { id: r.id }, data: { recordatorioEnviado: true } });
    avisados += 1;
  }

  return { revisadas: pendientes.length, avisados };
}
