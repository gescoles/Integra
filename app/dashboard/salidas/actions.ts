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
  const esDirectivoSesion = rolActual === "SUPERADMIN" || rolActual === "COORDINADOR" || rolActual === "ADMIN_CENTRO" || rolActual === "ADMINISTRACION";
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

  // Aviso al equipo directivo del centro (mejor esfuerzo: si el email falla,
  // la salida ya se ha creado igualmente).
  let avisoOk = true;
  let avisoError: string | undefined;
  try {
    const equipoDirectivo = await prisma.user.findMany({
      where: { schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION"] } },
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
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO" && role !== "ADMINISTRACION")) {
    throw new Error("No autorizado.");
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
      where: { schoolId: salida.schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION"] } },
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
        select: { name: true, email: true },
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
    }
  } catch {
    // La aprobación ya se ha guardado; si el email falla no lo bloqueamos.
  }
}

export async function rechazarSalida(id: string) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO" && role !== "ADMINISTRACION")) {
    throw new Error("No autorizado.");
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
      where: { schoolId: salida.schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION"] } },
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
  // Anular lo puede hacer todo el equipo directivo (Coordinador y
  // Admin. de Centro), igual que aprobar/rechazar.
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO" && role !== "ADMINISTRACION")) {
    throw new Error("No autorizado.");
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
    ((role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION") && salida.schoolId === session.user.schoolId);

  if (!puedeGestionarTodo) {
    if (salida.creadoPorId !== session.user.id) {
      throw new Error("No puedes eliminar una salida que no has creado tú.");
    }
    if (salida.estado !== "PENDIENTE") {
      throw new Error("Ya no puedes eliminar esta salida: solo se pueden eliminar las que todavía están pendientes.");
    }
  }

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
    ((role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION") && salidaActual.schoolId === session.user.schoolId);

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
    // eliminado — solo se le ha quitado a él).
    if (removidos.length > 0) {
      const usuariosRemovidos = await prisma.user.findMany({
        where: { id: { in: removidos } },
        select: { name: true, email: true },
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
    }

    // A quien se ha añadido nuevo como acompañante: toda la información,
    // igual que cuando se aprueba la salida.
    if (añadidos.length > 0) {
      const usuariosAñadidos = await prisma.user.findMany({
        where: { id: { in: añadidos } },
        select: { name: true, email: true },
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
    }
  } catch {
    // La salida ya se ha actualizado; si el email falla no lo bloqueamos.
  }
}
