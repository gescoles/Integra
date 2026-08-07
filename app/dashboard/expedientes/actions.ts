"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrioridadIncidencia } from "@prisma/client";
import { notifyUsers, clearNotificationsFor } from "@/lib/notifications";
import { sendIncidenciaCreadaEmail, sendTresIncidenciasEmail } from "@/lib/email";

function texto(formData: FormData, campo: string) {
  const raw = (formData.get(campo) as string)?.trim();
  return raw || null;
}

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO";
}

async function puedeGestionar(incidenciaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { ok: false as const };

  const incidencia = await prisma.incidencia.findUnique({ where: { id: incidenciaId } });
  if (!incidencia) return { ok: false as const };

  const role = session.user.role;
  const permitido =
    esDirectivo(role) ||
    incidencia.tutorId === session.user.id ||
    incidencia.creadorId === session.user.id;

  return { ok: permitido, incidencia, session };
}

export async function crearIncidencia(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const alumnoId = formData.get("alumnoId") as string;
  const tutorId = formData.get("tutorId") as string;
  const tipoIncidencia = (formData.get("tipoIncidencia") as string)?.trim();
  const prioridad = (formData.get("prioridad") as string) as PrioridadIncidencia;
  const fechaRaw = formData.get("fecha") as string;
  const descripcion = (formData.get("descripcion") as string)?.trim();

  if (!alumnoId) throw new Error("Elige el alumno.");
  if (!tutorId) throw new Error("Elige el tutor responsable.");
  if (!tipoIncidencia) throw new Error("Indica el tipo de incidencia.");
  if (!fechaRaw) throw new Error("Indica la fecha.");
  if (!descripcion) throw new Error("Añade una descripción.");

  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId }, select: { nombre: true, curso: true } });
  if (!alumno) throw new Error("No se ha encontrado el alumno.");

  const familiaInformada = formData.get("familiaInformada") === "on";

  const incidencia = await prisma.incidencia.create({
    data: {
      schoolId: session.user.schoolId,
      alumnoId,
      creadorId: session.user.id,
      tutorId,
      tipoIncidencia,
      prioridad: prioridad || "MEDIA",
      fecha: new Date(fechaRaw),
      lugar: texto(formData, "lugar"),
      descripcion,
      observaciones: texto(formData, "observaciones"),
      medidasAplicadas: texto(formData, "medidasAplicadas"),
      familiaInformada,
      familiaInformadaFecha: familiaInformada ? new Date() : null,
      familiaInformadaComunicacion: texto(formData, "familiaInformadaComunicacion"),
      eventos: {
        create: {
          tipo: "CREACION",
          descripcion: "Incidencia creada",
          autorId: session.user.id,
        },
      },
    },
  });

  // Aviso al tutor: email + notificación en la app (mejor esfuerzo, que un
  // fallo de envío no impida guardar la incidencia).
  const tutor = await prisma.user.findUnique({ where: { id: tutorId }, select: { name: true, email: true } });
  if (tutor?.email) {
    try {
      await sendIncidenciaCreadaEmail({
        to: tutor.email,
        tutorNombre: tutor.name ?? tutor.email,
        creadorNombre: session.user.name ?? session.user.email ?? "Un profesor",
        alumnoNombre: alumno.nombre,
        curso: alumno.curso,
        tipoIncidencia,
        prioridad: prioridad || "MEDIA",
        fecha: new Date(fechaRaw),
        lugar: texto(formData, "lugar"),
        descripcion,
      });
    } catch {
      // No pasa nada si falla el email; la notificación en la app ya avisa.
    }
  }

  await notifyUsers([tutorId], {
    schoolId: session.user.schoolId,
    tipo: "INCIDENCIA_ASIGNADA",
    titulo: "Nueva incidencia asignada",
    mensaje: `${alumno.nombre} · ${tipoIncidencia}`,
    link: "/dashboard/expedientes",
    relatedId: incidencia.id,
  });

  // Aviso especial al llegar exactamente a la 3ª incidencia del alumno: al
  // tutor (o tutores, si ha tenido varios) + todo el equipo directivo del
  // centro, por email y notificación.
  const totalIncidenciasAlumno = await prisma.incidencia.count({ where: { alumnoId } });
  if (totalIncidenciasAlumno === 3) {
    const [tutoresPrevios, directivos] = await Promise.all([
      prisma.incidencia.findMany({
        where: { alumnoId },
        select: { tutorId: true },
        distinct: ["tutorId"],
      }),
      prisma.user.findMany({
        where: { schoolId: session.user.schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO"] } },
        select: { id: true, email: true },
      }),
    ]);

    const idsAvisar = Array.from(new Set([...tutoresPrevios.map((t) => t.tutorId), ...directivos.map((d) => d.id)]));

    await notifyUsers(idsAvisar, {
      schoolId: session.user.schoolId,
      tipo: "TRES_INCIDENCIAS",
      titulo: "3 incidencias registradas",
      mensaje: `${alumno.nombre} (${alumno.curso}) ha llegado a 3 incidencias.`,
      link: "/dashboard/expedientes",
      relatedId: alumnoId,
    });

    const emails = new Set<string>();
    directivos.forEach((d) => d.email && emails.add(d.email));
    if (tutor?.email) emails.add(tutor.email);

    try {
      await sendTresIncidenciasEmail({
        to: Array.from(emails),
        alumnoNombre: alumno.nombre,
        curso: alumno.curso,
      });
    } catch {
      // El aviso en la app ya ha quedado registrado igualmente.
    }
  }

  revalidatePath("/dashboard/expedientes");
  return { id: incidencia.id };
}

export async function actualizarIncidencia(formData: FormData) {
  const id = formData.get("id") as string;
  const permiso = await puedeGestionar(id);
  if (!permiso.ok || !permiso.session) throw new Error("No autorizado.");

  const tutorId = formData.get("tutorId") as string;
  const tipoIncidencia = (formData.get("tipoIncidencia") as string)?.trim();
  const prioridad = (formData.get("prioridad") as string) as PrioridadIncidencia;
  const fechaRaw = formData.get("fecha") as string;
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const familiaInformada = formData.get("familiaInformada") === "on";
  const eraFamiliaInformada = permiso.incidencia!.familiaInformada;

  await prisma.incidencia.update({
    where: { id },
    data: {
      tutorId: tutorId || undefined,
      tipoIncidencia: tipoIncidencia || undefined,
      prioridad: prioridad || undefined,
      fecha: fechaRaw ? new Date(fechaRaw) : undefined,
      lugar: texto(formData, "lugar"),
      descripcion: descripcion || undefined,
      observaciones: texto(formData, "observaciones"),
      medidasAplicadas: texto(formData, "medidasAplicadas"),
      familiaInformada,
      familiaInformadaFecha: familiaInformada && !eraFamiliaInformada ? new Date() : undefined,
      familiaInformadaComunicacion: texto(formData, "familiaInformadaComunicacion"),
      eventos: {
        create: {
          tipo: "EDICION",
          descripcion: !eraFamiliaInformada && familiaInformada ? "Incidencia editada y familia informada" : "Incidencia editada",
          autorId: permiso.session.user.id,
        },
      },
    },
  });

  revalidatePath("/dashboard/expedientes");
}

export async function cambiarEstadoIncidencia(id: string, estado: "EN_SEGUIMIENTO" | "CERRADA" | "ABIERTA") {
  const permiso = await puedeGestionar(id);
  if (!permiso.ok || !permiso.session || !permiso.incidencia) throw new Error("No autorizado.");

  if (estado === "EN_SEGUIMIENTO" && !permiso.incidencia.familiaInformada) {
    throw new Error(
      "No puedes marcar esta incidencia en seguimiento sin informar antes a la familia. Edita la incidencia y marca la casilla \"Familia informada\"."
    );
  }

  const etiquetas: Record<string, string> = {
    ABIERTA: "Incidencia reabierta",
    EN_SEGUIMIENTO: "Marcada en seguimiento",
    CERRADA: "Incidencia cerrada",
  };

  await prisma.incidencia.update({
    where: { id },
    data: {
      estado,
      eventos: {
        create: {
          tipo: estado,
          descripcion: etiquetas[estado],
          autorId: permiso.session.user.id,
        },
      },
    },
  });

  if (estado === "CERRADA") {
    await clearNotificationsFor(id);
  }

  revalidatePath("/dashboard/expedientes");
}

export async function eliminarIncidencia(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede eliminar expedientes.");
  }

  await prisma.incidencia.delete({ where: { id } });
  revalidatePath("/dashboard/expedientes");
}

export async function aplicarSancion(formData: FormData) {
  const id = formData.get("id") as string;
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede aplicar un parte con expulsión.");
  }

  const diasRaw = formData.get("sancionDias") as string;
  const motivo = (formData.get("sancionMotivo") as string)?.trim();
  const dias = Number(diasRaw);

  if (!dias || dias < 1) throw new Error("Indica un número de días de expulsión válido.");
  if (!motivo) throw new Error("Indica el motivo del parte.");

  await prisma.incidencia.update({
    where: { id },
    data: {
      sancionDias: dias,
      sancionMotivo: motivo,
      sancionFecha: new Date(),
      sancionPorId: session.user.id,
      eventos: {
        create: {
          tipo: "SANCION",
          descripcion: `Parte con expulsión de ${dias} día${dias > 1 ? "s" : ""}: ${motivo}`,
          autorId: session.user.id,
        },
      },
    },
  });

  revalidatePath("/dashboard/expedientes");
}
