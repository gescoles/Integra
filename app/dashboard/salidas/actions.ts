"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  sendSalidaCreadaEmail,
  sendSalidaAprobadaEmail,
  sendSalidaDetalleAcompananteEmail,
  sendSalidaRechazadaEmail,
  sendSalidaAnuladaEmail,
  sendSalidaEliminadaEmail,
  sendSalidaModificadaEmail,
  sendSalidaYaNoAcompananteEmail,
} from "@/lib/email";
import { notifyUsers, clearNotificationsFor } from "@/lib/notifications";
import { createTeamsCalendarEvent, deleteTeamsCalendarEvent } from "@/lib/microsoftGraph";

// Crea (mejor esfuerzo, nunca bloquea el flujo principal) el evento de
// Teams de un acompañante en el calendario de esa salida ya aprobada, y
// guarda el id devuelto para poder borrarlo/actualizarlo más adelante.
async function crearEventoTeamsAcompanante(params: {
  salidaId: string;
  userId: string;
  userEmail: string;
  actividad: string;
  curso: string;
  observaciones: string | null;
  fecha: Date;
  horaSalida: string;
  horaVuelta: string;
}) {
  try {
    // Si ya tenía un evento (por ejemplo, se está recreando tras editar la
    // fecha/hora), se borra primero el viejo para no dejarlo huérfano en
    // su calendario junto al nuevo.
    const existente = await prisma.salidaTeamsEvento.findUnique({
      where: { salidaId_userId: { salidaId: params.salidaId, userId: params.userId } },
    });
    if (existente) {
      try {
        await deleteTeamsCalendarEvent(params.userEmail, existente.teamsEventId);
      } catch {
        // no bloqueamos por esto.
      }
    }

    const [hIni, mIni] = params.horaSalida.split(":").map(Number);
    const [hFin, mFin] = params.horaVuelta.split(":").map(Number);
    const inicio = new Date(params.fecha);
    inicio.setHours(hIni, mIni, 0, 0);
    const fin = new Date(params.fecha);
    fin.setHours(hFin, mFin, 0, 0);

    const evento = await createTeamsCalendarEvent({
      userEmail: params.userEmail,
      subject: `Salida: ${params.actividad} (${params.curso})`,
      bodyHtml: params.observaciones ?? "",
      start: inicio,
      end: fin,
    });

    await prisma.salidaTeamsEvento.upsert({
      where: { salidaId_userId: { salidaId: params.salidaId, userId: params.userId } },
      create: { salidaId: params.salidaId, userId: params.userId, teamsEventId: evento.id },
      update: { teamsEventId: evento.id },
    });
  } catch {
    // No bloqueamos por esto — en el peor caso, el acompañante no ve la
    // salida en su calendario de Teams pero sigue recibiendo el email.
  }
}

// Borra (mejor esfuerzo) el evento de Teams de un acompañante, si tenía
// uno guardado para esta salida.
async function eliminarEventoTeamsAcompanante(salidaId: string, userId: string, userEmail: string | null | undefined) {
  const registro = await prisma.salidaTeamsEvento.findUnique({
    where: { salidaId_userId: { salidaId, userId } },
  });
  if (!registro) return;
  if (userEmail) {
    try {
      await deleteTeamsCalendarEvent(userEmail, registro.teamsEventId);
    } catch {
      // igual que arriba: no bloqueamos por esto.
    }
  }
  await prisma.salidaTeamsEvento.delete({ where: { id: registro.id } }).catch(() => {});
}

// Borra todos los eventos de Teams de todos los acompañantes de una
// salida (se usa al anularla o eliminarla).
async function eliminarTodosEventosTeamsSalida(salidaId: string) {
  const registros = await prisma.salidaTeamsEvento.findMany({
    where: { salidaId },
    include: { user: { select: { email: true } } },
  });
  await Promise.all(
    registros.map(async (r) => {
      try {
        await deleteTeamsCalendarEvent(r.user.email, r.teamsEventId);
      } catch {
        // no bloqueamos por esto.
      }
    })
  );
  await prisma.salidaTeamsEvento.deleteMany({ where: { salidaId } });
}

export async function createSalida(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const schoolId = session.user.schoolId;
  const curso = (formData.get("curso") as string)?.trim();
  const tipo = (formData.get("tipo") as string)?.trim();
  const actividad = (formData.get("actividad") as string)?.trim();
  const fechaRaw = formData.get("fecha") as string;
  const horaSalida = (formData.get("horaSalida") as string)?.trim();
  const horaVuelta = (formData.get("horaVuelta") as string)?.trim();
  const rolActual = session.user.role;
  const esDirectivoSesion = rolActual === "SUPERADMIN" || rolActual === "DIRECCION" || rolActual === "COORDINADOR" || rolActual === "ADMIN_CENTRO" || rolActual === "ADMINISTRACION";
  // Un profesor siempre es el responsable de la salida que crea — aunque
  // manipule el formulario, aquí se ignora lo que mande y se fuerza a que
  // sea él mismo.
  const responsableId = esDirectivoSesion ? (formData.get("responsableId") as string)?.trim() : session.user.id;
  const departamentoId = (formData.get("departamentoId") as string)?.trim();
  const profesoresIds = formData.getAll("profesoresIds").map(String).filter(Boolean);
  const numAlumnosRaw = formData.get("numAlumnos") as string;
  const costoRaw = formData.get("costo") as string;
  const moneda = (formData.get("moneda") as string) || "EUR";
  const observaciones = (formData.get("observaciones") as string)?.trim();
  if (!observaciones) throw new Error("La información de la salida es obligatoria.");

  if (!curso) throw new Error("El curso/grupo es obligatorio.");
  if (!actividad) throw new Error("La actividad es obligatoria.");
  if (!fechaRaw) throw new Error("La fecha es obligatoria.");
  if (!horaSalida) throw new Error("La hora de salida es obligatoria.");
  if (!horaVuelta) throw new Error("La hora de vuelta es obligatoria.");
  if (!responsableId) throw new Error("Elige quién es el responsable.");
  if (!departamentoId) throw new Error("Elige el departamento.");
  if (!numAlumnosRaw) throw new Error("El número de alumnos es obligatorio.");

  const fecha = new Date(`${fechaRaw}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) throw new Error("Fecha no válida.");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fecha < hoy) throw new Error("La fecha de la salida no puede ser anterior a hoy.");

  let salida;
  try {
    salida = await prisma.salida.create({
      data: {
        schoolId,
        curso,
        tipo: tipo || null,
        actividad,
        fecha,
        horaSalida,
        horaVuelta,
        responsableId,
        departamentoId,
        profesoresIds,
        numAlumnos: Number(numAlumnosRaw) || 0,
        costo: Number(costoRaw) || 0,
        moneda,
        observaciones: observaciones || null,
        creadoPorId: session.user.id,
      },
    });
  } catch (e) {
    // Si esto falla, casi siempre es porque falta aplicar una migración
    // pendiente de la base de datos (npx prisma migrate deploy).
    const detalle = e instanceof Error ? e.message : "Error desconocido";
    throw new Error(`No se pudo guardar la salida en la base de datos: ${detalle}`);
  }

  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/salidas/aprobaciones");
  revalidatePath("/dashboard");

  // Aviso a Dirección (mejor esfuerzo: si el email falla, la salida ya se
  // ha creado igualmente). Solo Dirección aprueba salidas, así que es la
  // única que necesita enterarse de que hay una pendiente.
  let avisoOk = true;
  let avisoError: string | undefined;
  try {
    const equipoDirectivo = await prisma.user.findMany({
      where: { schoolId, role: { in: ["DIRECCION"] } },
      select: { id: true, email: true },
    });
    const creador = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const creadorNombre = creador?.name ?? creador?.email ?? "Un profesor";

    // Notificación real dentro de la app (la campanita), solo para el
    // equipo directivo DE ESE CENTRO — nadie de otro centro la ve.
    await notifyUsers(
      equipoDirectivo.map((u) => u.id),
      {
        schoolId,
        tipo: "SALIDA_CREADA",
        titulo: "Nueva salida pendiente de aprobar",
        mensaje: `${creadorNombre} ha propuesto "${actividad}" (${curso}) para el ${fecha.toLocaleDateString("es-ES")}.`,
        link: "/dashboard/salidas/aprobaciones",
        relatedId: salida.id,
      }
    );

    await sendSalidaCreadaEmail({
      to: equipoDirectivo.map((u) => u.email),
      creadorNombre,
      curso,
      tipo,
      actividad,
      fecha,
      horaSalida,
      horaVuelta,
      numAlumnos: Number(numAlumnosRaw) || 0,
    });
  } catch (e) {
    avisoOk = false;
    avisoError = e instanceof Error ? e.message : "Error desconocido";
  }

  return { id: salida.id, avisoOk, avisoError };
}

export async function aprobarSalida(id: string) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "DIRECCION")) {
    throw new Error("Solo Dirección o SuperAdmin puede aprobar una salida.");
  }

  const existente = await prisma.salida.findUnique({ where: { id }, select: { schoolId: true } });
  if (!existente) throw new Error("No se ha encontrado la salida.");
  if (role !== "SUPERADMIN" && existente.schoolId !== session.user.schoolId) {
    throw new Error("No puedes aprobar una salida de otro centro.");
  }

  const salida = await prisma.salida.update({
    where: { id },
    data: { estado: "APROBADA" },
    include: {
      creadoPor: { select: { name: true, email: true } },
      responsable: { select: { name: true, email: true } },
      departamento: { include: { profesores: true, coordinadores: true } },
    },
  });

  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/salidas/aprobaciones");
  revalidatePath("/dashboard");

  // La notificación de "pendiente de aprobar" ya no tiene sentido para
  // nadie del equipo directivo una vez resuelta: la quitamos para todos.
  await clearNotificationsFor(id);

  try {
    // Avisamos al profesor que la creó, a todo el equipo directivo del
    // centro, Y a todos los profesores/coordinadores del departamento de
    // la salida (si tiene uno asignado), para que todo el mundo se entere
    // de la decisión, no solo quien la haya aprobado.
    const equipoDirectivo = await prisma.user.findMany({
      where: { schoolId: salida.schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION", "DIRECCION"] } },
      select: { id: true, email: true },
    });
    const profesoresDepartamento = salida.departamento
      ? [...salida.departamento.profesores, ...salida.departamento.coordinadores]
      : [];
    const destinatarios = new Set([
      salida.creadoPor.email,
      ...equipoDirectivo.map((u) => u.email),
      ...profesoresDepartamento.map((u) => u.email),
    ]);

    await notifyUsers([salida.creadoPorId], {
      schoolId: salida.schoolId,
      tipo: "SALIDA_APROBADA",
      titulo: "Tu salida ha sido aprobada",
      mensaje: `"${salida.actividad}" (${salida.curso}) ha sido aprobada.`,
      link: "/dashboard/salidas",
    });

    if (profesoresDepartamento.length > 0) {
      await notifyUsers(
        profesoresDepartamento.map((u) => u.id),
        {
          schoolId: salida.schoolId,
          tipo: "SALIDA_APROBADA",
          titulo: "Salida aprobada en tu departamento",
          mensaje: `"${salida.actividad}" (${salida.curso}) ha sido aprobada.`,
          link: "/dashboard/salidas",
        }
      );
    }

    await Promise.all(
      Array.from(destinatarios).map((to) =>
        sendSalidaAprobadaEmail({
          to,
          profesorNombre: salida.creadoPor.name ?? salida.creadoPor.email,
          actividad: salida.actividad,
          fecha: salida.fecha,
        })
      )
    );

    // A los profesores acompañantes (los marcados al crear la salida) NO
    // se les manda el aviso corto de "aprobada": se les manda un correo
    // aparte con todos los detalles de la salida, ya que ellos van a ir
    // de verdad y necesitan la información completa, no solo el estado.
    if (salida.profesoresIds.length > 0) {
      const acompanantes = await prisma.user.findMany({
        where: { id: { in: salida.profesoresIds } },
        select: { id: true, name: true, email: true },
      });
      await Promise.all(
        acompanantes.map((a) =>
          sendSalidaDetalleAcompananteEmail({
            to: a.email,
            profesorNombre: a.name ?? a.email,
            actividad: salida.actividad,
            curso: salida.curso,
            tipo: salida.tipo,
            fecha: salida.fecha,
            horaSalida: salida.horaSalida,
            horaVuelta: salida.horaVuelta,
            numAlumnos: salida.numAlumnos,
            responsableNombre: salida.responsable.name ?? salida.responsable.email,
            departamentoNombre: salida.departamento?.nombre ?? null,
            informacion: salida.observaciones,
          })
        )
      );

      // Y a cada uno se le añade el evento en su calendario de Teams,
      // ahora que la salida ya es oficial.
      const horaVuelta = salida.horaVuelta;
      if (horaVuelta) {
        await Promise.all(
          acompanantes.map((a) =>
            crearEventoTeamsAcompanante({
              salidaId: salida.id,
              userId: a.id,
              userEmail: a.email,
              actividad: salida.actividad,
              curso: salida.curso,
              observaciones: salida.observaciones,
              fecha: salida.fecha,
              horaSalida: salida.horaSalida,
              horaVuelta,
            })
          )
        );
      }
    }
  } catch {
    // La aprobación ya se ha guardado; si el email falla no lo bloqueamos.
  }
}

export async function rechazarSalida(id: string) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "DIRECCION")) {
    throw new Error("Solo Dirección o SuperAdmin puede rechazar una salida.");
  }

  const existente = await prisma.salida.findUnique({ where: { id }, select: { schoolId: true } });
  if (!existente) throw new Error("No se ha encontrado la salida.");
  if (role !== "SUPERADMIN" && existente.schoolId !== session.user.schoolId) {
    throw new Error("No puedes rechazar una salida de otro centro.");
  }

  const salida = await prisma.salida.update({
    where: { id },
    data: { estado: "RECHAZADA" },
    include: { creadoPor: { select: { name: true, email: true } } },
  });

  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/salidas/aprobaciones");
  revalidatePath("/dashboard");

  await clearNotificationsFor(id);

  try {
    const equipoDirectivo = await prisma.user.findMany({
      where: { schoolId: salida.schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION", "DIRECCION"] } },
      select: { id: true, email: true },
    });
    const destinatarios = new Set([salida.creadoPor.email, ...equipoDirectivo.map((u) => u.email)]);

    await notifyUsers([salida.creadoPorId], {
      schoolId: salida.schoolId,
      tipo: "SALIDA_RECHAZADA",
      titulo: "Tu salida ha sido rechazada",
      mensaje: `"${salida.actividad}" (${salida.curso}) ha sido rechazada.`,
      link: "/dashboard/salidas",
    });

    await Promise.all(
      Array.from(destinatarios).map((to) =>
        sendSalidaRechazadaEmail({
          to,
          profesorNombre: salida.creadoPor.name ?? salida.creadoPor.email,
          actividad: salida.actividad,
          fecha: salida.fecha,
        })
      )
    );
  } catch {
    // igual que arriba: no bloqueamos por un fallo de email.
  }
}

// Todo el mundo relacionado con una salida: quien la creó, el responsable,
// y los profesores acompañantes — para avisar a todos cuando se elimina,
// modifica o anula, no solo a quien la creó.
async function obtenerImplicadosSalida(salida: {
  creadoPorId: string;
  responsableId: string;
  profesoresIds: string[];
}) {
  const ids = Array.from(new Set([salida.creadoPorId, salida.responsableId, ...salida.profesoresIds]));
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
}

export async function anularSalida(id: string, motivo: string) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  // Anular es una decisión del mismo tipo que aprobar/rechazar: exclusiva
  // de Dirección (y SuperAdmin). El resto del equipo directivo solo
  // consulta las salidas, no decide sobre ellas.
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "DIRECCION")) {
    throw new Error("Solo Dirección o SuperAdmin puede anular una salida.");
  }

  const motivoLimpio = motivo?.trim();
  if (!motivoLimpio) throw new Error("El motivo de la anulación es obligatorio.");

  const existente = await prisma.salida.findUnique({ where: { id }, select: { schoolId: true, estado: true } });
  if (!existente) throw new Error("No se ha encontrado la salida.");
  if (role !== "SUPERADMIN" && existente.schoolId !== session.user.schoolId) {
    throw new Error("No puedes anular una salida de otro centro.");
  }
  if (existente.estado !== "APROBADA") {
    throw new Error("Solo se pueden anular salidas que ya estén aprobadas.");
  }

  const salida = await prisma.salida.update({
    where: { id },
    data: {
      estado: "ANULADA",
      motivoAnulacion: motivoLimpio,
      anuladaPorId: session.user.id,
      fechaAnulacion: new Date(),
    },
    include: { creadoPor: { select: { name: true, email: true } } },
  });

  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/salidas/aprobaciones");
  revalidatePath("/dashboard");

  await clearNotificationsFor(id);
  await eliminarTodosEventosTeamsSalida(id);

  try {
    const anuladoPor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const anuladoPorNombre = anuladoPor?.name ?? anuladoPor?.email ?? "Dirección";

    const implicados = await obtenerImplicadosSalida(salida);

    await notifyUsers(
      implicados.map((u) => u.id),
      {
        schoolId: salida.schoolId,
        tipo: "SALIDA_ANULADA",
        titulo: "Salida anulada",
        mensaje: `"${salida.actividad}" (${salida.curso}) ha sido anulada. Motivo: ${motivoLimpio}`,
        link: "/dashboard/salidas",
      }
    );

    await Promise.all(
      implicados.map((u) =>
        sendSalidaAnuladaEmail({
          to: u.email,
          profesorNombre: u.name ?? u.email,
          actividad: salida.actividad,
          fecha: salida.fecha,
          motivo: motivoLimpio,
          anuladoPorNombre,
        })
      )
    );
  } catch {
    // La anulación ya se ha guardado; si el email falla no lo bloqueamos.
  }
}

export async function deleteSalida(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const salida = await prisma.salida.findUnique({ where: { id } });
  if (!salida) throw new Error("No se ha encontrado la salida.");

  const role = session.user.role;
  const puedeGestionarTodo =
    role === "SUPERADMIN" ||
    ((role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION") && salida.schoolId === session.user.schoolId);

  if (!puedeGestionarTodo) {
    if (salida.creadoPorId !== session.user.id) {
      throw new Error("No puedes eliminar una salida que no has creado tú.");
    }
    if (salida.estado !== "PENDIENTE") {
      throw new Error("Ya no puedes eliminar esta salida: solo se pueden eliminar las que todavía están pendientes.");
    }
  }

  // Hay que borrar los eventos de Teams ANTES de borrar la salida (el
  // borrado de la salida arrastra en cascada las filas de SalidaTeamsEvento,
  // así que después ya no tendríamos cómo saber qué evento borrar de cada
  // calendario).
  await eliminarTodosEventosTeamsSalida(id);
  await prisma.salida.delete({ where: { id } });
  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/salidas/aprobaciones");
  revalidatePath("/dashboard");

  try {
    const eliminadoPor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const eliminadoPorNombre = eliminadoPor?.name ?? eliminadoPor?.email ?? "Dirección";
    const implicados = await obtenerImplicadosSalida(salida);

    await notifyUsers(
      implicados.map((u) => u.id),
      {
        schoolId: salida.schoolId,
        tipo: "SALIDA_ELIMINADA",
        titulo: "Salida eliminada",
        mensaje: `"${salida.actividad}" (${salida.curso}) ha sido eliminada.`,
        link: "/dashboard/salidas",
      }
    );

    await Promise.all(
      implicados.map((u) =>
        sendSalidaEliminadaEmail({
          to: u.email,
          profesorNombre: u.name ?? u.email,
          actividad: salida.actividad,
          curso: salida.curso,
          fecha: salida.fecha,
          eliminadoPorNombre,
        })
      )
    );
  } catch {
    // La salida ya se ha borrado; si el email falla no lo bloqueamos.
  }
}

export async function editarSalida(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const id = formData.get("id") as string;
  const salidaActual = await prisma.salida.findUnique({ where: { id } });
  if (!salidaActual) throw new Error("No se ha encontrado la salida.");

  const role = session.user.role;
  const puedeGestionarTodo =
    role === "SUPERADMIN" ||
    ((role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION") && salidaActual.schoolId === session.user.schoolId);

  if (!puedeGestionarTodo) {
    if (salidaActual.creadoPorId !== session.user.id) {
      throw new Error("No puedes modificar una salida que no has creado tú.");
    }
    if (salidaActual.estado !== "PENDIENTE") {
      throw new Error("Ya no puedes modificar esta salida: solo se pueden modificar las que todavía están pendientes.");
    }
  }

  const curso = (formData.get("curso") as string)?.trim();
  const tipo = (formData.get("tipo") as string)?.trim();
  const actividad = (formData.get("actividad") as string)?.trim();
  const fechaRaw = formData.get("fecha") as string;
  const horaSalida = (formData.get("horaSalida") as string)?.trim();
  const horaVuelta = (formData.get("horaVuelta") as string)?.trim();
  const responsableId = (formData.get("responsableId") as string)?.trim();
  const departamentoId = (formData.get("departamentoId") as string)?.trim();
  const profesoresIds = formData.getAll("profesoresIds").map(String).filter(Boolean);
  const numAlumnosRaw = formData.get("numAlumnos") as string;
  const costoRaw = formData.get("costo") as string;
  const moneda = (formData.get("moneda") as string) || "EUR";
  const observaciones = (formData.get("observaciones") as string)?.trim();
  if (!observaciones) throw new Error("La información de la salida es obligatoria.");

  if (!curso) throw new Error("El curso/grupo es obligatorio.");
  if (!actividad) throw new Error("La actividad es obligatoria.");
  if (!fechaRaw) throw new Error("La fecha es obligatoria.");
  if (!horaSalida) throw new Error("La hora de salida es obligatoria.");
  if (!horaVuelta) throw new Error("La hora de vuelta es obligatoria.");
  if (!responsableId) throw new Error("Elige quién es el responsable.");
  if (!departamentoId) throw new Error("Elige el departamento.");
  if (!numAlumnosRaw) throw new Error("El número de alumnos es obligatorio.");

  const fecha = new Date(`${fechaRaw}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) throw new Error("Fecha no válida.");
  const hoyEdit = new Date();
  hoyEdit.setHours(0, 0, 0, 0);
  if (fecha < hoyEdit) throw new Error("La fecha de la salida no puede ser anterior a hoy.");

  const salidaActualizada = await prisma.salida.update({
    where: { id },
    data: {
      curso,
      tipo: tipo || null,
      actividad,
      fecha,
      horaSalida,
      horaVuelta,
      responsableId,
      departamentoId,
      profesoresIds,
      numAlumnos: Number(numAlumnosRaw) || 0,
      costo: Number(costoRaw) || 0,
      moneda,
      observaciones: observaciones || null,
    },
    include: {
      responsable: { select: { name: true, email: true } },
      departamento: { select: { nombre: true } },
    },
  });

  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/salidas/aprobaciones");
  revalidatePath("/dashboard");

  try {
    const modificadoPor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const modificadoPorNombre = modificadoPor?.name ?? modificadoPor?.email ?? "Dirección";

    // Acompañantes que había antes de editar vs. los que hay ahora, para
    // saber a quién se ha quitado (aviso de "ya no hace falta") y a quién
    // se ha añadido nuevo (aviso con toda la información, como al aprobar).
    const acompanantesAntes = new Set(salidaActual.profesoresIds);
    const acompanantesDespues = new Set(profesoresIds);
    const removidos = salidaActual.profesoresIds.filter((pid) => !acompanantesDespues.has(pid));
    const añadidos = profesoresIds.filter((pid) => !acompanantesAntes.has(pid));

    // El aviso genérico de "salida modificada" es solo para quien ya
    // estaba implicado y sigue estándolo (responsable, creador, y los
    // acompañantes que no han cambiado) — los quitados y los añadidos ya
    // reciben su propio aviso específico, para no duplicar correos.
    const implicadosGenerales = await obtenerImplicadosSalida({
      creadoPorId: salidaActualizada.creadoPorId,
      responsableId: salidaActualizada.responsableId,
      profesoresIds: profesoresIds.filter((pid) => acompanantesAntes.has(pid)),
    });

    await notifyUsers(
      implicadosGenerales.map((u) => u.id),
      {
        schoolId: salidaActualizada.schoolId,
        tipo: "SALIDA_MODIFICADA",
        titulo: "Salida modificada",
        mensaje: `"${salidaActualizada.actividad}" (${salidaActualizada.curso}) ha sido modificada.`,
        link: "/dashboard/salidas",
      }
    );

    await Promise.all(
      implicadosGenerales.map((u) =>
        sendSalidaModificadaEmail({
          to: u.email,
          profesorNombre: u.name ?? u.email,
          actividad: salidaActualizada.actividad,
          curso: salidaActualizada.curso,
          tipo: salidaActualizada.tipo,
          fecha: salidaActualizada.fecha,
          horaSalida: salidaActualizada.horaSalida,
          horaVuelta: salidaActualizada.horaVuelta,
          numAlumnos: salidaActualizada.numAlumnos,
          responsableNombre: salidaActualizada.responsable.name ?? salidaActualizada.responsable.email,
          departamentoNombre: salidaActualizada.departamento?.nombre ?? null,
          informacion: salidaActualizada.observaciones,
          modificadoPorNombre,
        })
      )
    );

    // A quien se ha quitado como acompañante: aviso de que ya no forma
    // parte de esta salida (la salida en sí sigue adelante, no se ha
    // eliminado — solo se le ha quitado a él), y se le borra su evento
    // del calendario de Teams si lo tenía.
    if (removidos.length > 0) {
      const usuariosRemovidos = await prisma.user.findMany({
        where: { id: { in: removidos } },
        select: { id: true, name: true, email: true },
      });
      await Promise.all(
        usuariosRemovidos.map((u) =>
          sendSalidaYaNoAcompananteEmail({
            to: u.email,
            profesorNombre: u.name ?? u.email,
            actividad: salidaActualizada.actividad,
            curso: salidaActualizada.curso,
            fecha: salidaActualizada.fecha,
            quitadoPorNombre: modificadoPorNombre,
          })
        )
      );
      await Promise.all(usuariosRemovidos.map((u) => eliminarEventoTeamsAcompanante(id, u.id, u.email)));
    }

    // A quien se ha añadido nuevo como acompañante: toda la información,
    // igual que cuando se aprueba la salida, y su evento en el calendario
    // de Teams (solo si la salida ya está aprobada — si sigue pendiente,
    // el evento se creará cuando se apruebe, igual que a los demás).
    if (añadidos.length > 0) {
      const usuariosAñadidos = await prisma.user.findMany({
        where: { id: { in: añadidos } },
        select: { id: true, name: true, email: true },
      });
      await Promise.all(
        usuariosAñadidos.map((u) =>
          sendSalidaDetalleAcompananteEmail({
            to: u.email,
            profesorNombre: u.name ?? u.email,
            actividad: salidaActualizada.actividad,
            curso: salidaActualizada.curso,
            tipo: salidaActualizada.tipo,
            fecha: salidaActualizada.fecha,
            horaSalida: salidaActualizada.horaSalida,
            horaVuelta: salidaActualizada.horaVuelta,
            numAlumnos: salidaActualizada.numAlumnos,
            responsableNombre: salidaActualizada.responsable.name ?? salidaActualizada.responsable.email,
            departamentoNombre: salidaActualizada.departamento?.nombre ?? null,
            informacion: salidaActualizada.observaciones,
          })
        )
      );
      const horaVueltaAñadidos = salidaActualizada.horaVuelta;
      if (salidaActualizada.estado === "APROBADA" && horaVueltaAñadidos) {
        await Promise.all(
          usuariosAñadidos.map((u) =>
            crearEventoTeamsAcompanante({
              salidaId: id,
              userId: u.id,
              userEmail: u.email,
              actividad: salidaActualizada.actividad,
              curso: salidaActualizada.curso,
              observaciones: salidaActualizada.observaciones,
              fecha: salidaActualizada.fecha,
              horaSalida: salidaActualizada.horaSalida,
              horaVuelta: horaVueltaAñadidos,
            })
          )
        );
      }
    }

    // Los acompañantes que ya lo eran y lo siguen siendo: si la salida ya
    // está aprobada (y por tanto ya tenían un evento en su calendario),
    // se les recrea con los datos actualizados por si ha cambiado la
    // fecha, la hora o la actividad.
    const horaVueltaContinuan = salidaActualizada.horaVuelta;
    if (salidaActualizada.estado === "APROBADA" && horaVueltaContinuan) {
      const continuan = profesoresIds.filter((pid) => acompanantesAntes.has(pid));
      if (continuan.length > 0) {
        const usuariosContinuan = await prisma.user.findMany({
          where: { id: { in: continuan } },
          select: { id: true, name: true, email: true },
        });
        await Promise.all(
          usuariosContinuan.map((u) =>
            crearEventoTeamsAcompanante({
              salidaId: id,
              userId: u.id,
              userEmail: u.email,
              actividad: salidaActualizada.actividad,
              curso: salidaActualizada.curso,
              observaciones: salidaActualizada.observaciones,
              fecha: salidaActualizada.fecha,
              horaSalida: salidaActualizada.horaSalida,
              horaVuelta: horaVueltaContinuan,
            })
          )
        );
      }
    }
  } catch {
    // La salida ya se ha actualizado; si el email falla no lo bloqueamos.
  }
}
