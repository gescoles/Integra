"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  sendSalidaCreadaEmail,
  sendSalidaAprobadaEmail,
  sendSalidaRechazadaEmail,
} from "@/lib/email";
import { notifyUsers } from "@/lib/notifications";

export async function createSalida(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const schoolId = session.user.schoolId;
  const curso = (formData.get("curso") as string)?.trim();
  const tipo = (formData.get("tipo") as string)?.trim();
  const actividad = (formData.get("actividad") as string)?.trim();
  const fechaRaw = formData.get("fecha") as string;
  const horaSalida = (formData.get("horaSalida") as string)?.trim();
  const vueltaDirectaCasa = formData.get("vueltaDirectaCasa") === "on";
  const horaVuelta = vueltaDirectaCasa ? "" : (formData.get("horaVuelta") as string)?.trim();
  const responsableId = (formData.get("responsableId") as string)?.trim();
  const profesoresIds = formData.getAll("profesoresIds").map(String).filter(Boolean);
  const numAlumnosRaw = formData.get("numAlumnos") as string;
  const costoRaw = formData.get("costo") as string;
  const moneda = (formData.get("moneda") as string) || "EUR";
  const observaciones = (formData.get("observaciones") as string)?.trim();

  if (!curso) throw new Error("El curso/grupo es obligatorio.");
  if (!tipo) throw new Error("El tipo de salida es obligatorio.");
  if (!actividad) throw new Error("La actividad es obligatoria.");
  if (!fechaRaw) throw new Error("La fecha es obligatoria.");
  if (!horaSalida) throw new Error("La hora de salida es obligatoria.");
  if (!vueltaDirectaCasa && !horaVuelta) throw new Error("La hora de vuelta es obligatoria (o marca que vuelven directamente a casa).");
  if (!responsableId) throw new Error("Elige quién es el responsable.");
  if (!numAlumnosRaw) throw new Error("El número de alumnos es obligatorio.");

  const fecha = new Date(`${fechaRaw}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) throw new Error("Fecha no válida.");

  let salida;
  try {
    salida = await prisma.salida.create({
      data: {
        schoolId,
        curso,
        tipo,
        actividad,
        fecha,
        horaSalida,
        horaVuelta: horaVuelta || null,
        vueltaDirectaCasa,
        responsableId,
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
      where: { schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO"] } },
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
      horaVuelta: vueltaDirectaCasa ? null : horaVuelta,
      vueltaDirectaCasa,
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
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO")) {
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
    include: { creadoPor: { select: { name: true, email: true } } },
  });

  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/salidas/aprobaciones");
  revalidatePath("/dashboard");

  try {
    // Avisamos al profesor que la creó Y a todo el equipo directivo del
    // centro, para que todo el mundo se entere de la decisión, no solo
    // quien la haya aprobado.
    const equipoDirectivo = await prisma.user.findMany({
      where: { schoolId: salida.schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO"] } },
      select: { id: true, email: true },
    });
    const destinatarios = new Set([salida.creadoPor.email, ...equipoDirectivo.map((u) => u.email)]);

    await notifyUsers([salida.creadoPorId], {
      schoolId: salida.schoolId,
      tipo: "SALIDA_APROBADA",
      titulo: "Tu salida ha sido aprobada",
      mensaje: `"${salida.actividad}" (${salida.curso}) ha sido aprobada.`,
      link: "/dashboard/salidas",
    });

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
  } catch {
    // La aprobación ya se ha guardado; si el email falla no lo bloqueamos.
  }
}

export async function rechazarSalida(id: string) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO")) {
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

  try {
    const equipoDirectivo = await prisma.user.findMany({
      where: { schoolId: salida.schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO"] } },
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

export async function deleteSalida(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const salida = await prisma.salida.findUnique({ where: { id } });
  if (!salida) throw new Error("No se ha encontrado la salida.");

  const role = session.user.role;
  const puedeGestionarTodo =
    role === "SUPERADMIN" ||
    ((role === "COORDINADOR" || role === "ADMIN_CENTRO") && salida.schoolId === session.user.schoolId);

  if (!puedeGestionarTodo && salida.creadoPorId !== session.user.id) {
    throw new Error("No puedes eliminar una salida que no has creado tú.");
  }

  await prisma.salida.delete({ where: { id } });
  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/salidas/aprobaciones");
  revalidatePath("/dashboard");
}
