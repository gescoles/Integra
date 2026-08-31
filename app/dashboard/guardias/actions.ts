"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GuardiaStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendGuardiaEmail, sendCoberturaEmail, sendSolicitudCoberturaEmail, sendCoberturaResueltaEmail, sendSolicitudRechazadaEmail, sendGuardiaEliminadaEmail, sendGuardiaModificadaEmail, sendCoberturaEliminadaEmail, sendCoberturaModificadaEmail, sendAusenciaAceptadaEmail } from "@/lib/email";
import { createTeamsCalendarEvent } from "@/lib/microsoftGraph";
import { notifyUsers } from "@/lib/notifications";
import { getSupabaseAdmin, JUSTIFICANTES_BUCKET } from "@/lib/supabaseAdmin";
import { ensureSubfolder, uploadGenericFileToDrive } from "@/lib/googleDrive";
import { safeFileName } from "@/lib/exportWorkbooks";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

// Aviso al sustituto (notificación + email), reutilizado tanto cuando
// dirección crea la guardia directamente como cuando resuelve una
// solicitud que ha mandado un profesor.
async function avisarSustituto(params: {
  schoolId: string;
  coberturaId: string;
  profesorSustitutoId: string;
  ausenteNombre: string;
  sustitutoNombre: string;
  sustitutoEmail: string | null;
  asignatura: string | null;
  grupo: string | null;
  ubicacion: string | null;
  trabajoAlumnos?: string | null;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
}) {
  await notifyUsers([params.profesorSustitutoId], {
    schoolId: params.schoolId,
    tipo: "COBERTURA_GUARDIA",
    titulo: "Tienes que cubrir una clase",
    mensaje: `${params.ausenteNombre} falta ${params.horaInicio}–${params.horaFin}${params.grupo ? ` · ${params.grupo}` : ""}${
      params.trabajoAlumnos ? ` · ${params.trabajoAlumnos}` : ""
    }`,
    link: "/dashboard/guardias",
    relatedId: params.coberturaId,
  });

  try {
    if (params.sustitutoEmail) {
      await sendCoberturaEmail({
        id: params.coberturaId,
        to: params.sustitutoEmail,
        sustitutoNombre: params.sustitutoNombre,
        ausenteNombre: params.ausenteNombre,
        asignatura: params.asignatura,
        grupo: params.grupo,
        ubicacion: params.ubicacion,
        trabajoAlumnos: params.trabajoAlumnos,
        fecha: params.fecha,
        horaInicio: params.horaInicio,
        horaFin: params.horaFin,
      });
    }
  } catch {
    // No pasa nada si falla el email; la notificación en la app ya ha avisado.
  }

  try {
    if (params.sustitutoEmail) {
      const [hIni, mIni] = params.horaInicio.split(":").map(Number);
      const [hFin, mFin] = params.horaFin.split(":").map(Number);
      const inicio = new Date(params.fecha);
      inicio.setHours(hIni, mIni, 0, 0);
      const fin = new Date(params.fecha);
      fin.setHours(hFin, mFin, 0, 0);
      await createTeamsCalendarEvent({
        userEmail: params.sustitutoEmail,
        subject: `Guardia: cubrir a ${params.ausenteNombre}`,
        bodyHtml: `Cobertura de guardia.${params.asignatura ? ` Asignatura: ${params.asignatura}.` : ""}${params.grupo ? ` Grupo: ${params.grupo}.` : ""}`,
        start: inicio,
        end: fin,
        location: params.ubicacion || undefined,
      });
    }
  } catch {
    // Igual que el email: si falla Teams, no pasa nada — la notificación
    // en la app y el correo ya han avisado de todas formas.
  }
}

// Busca una cobertura: el profesor ausente, la franja horaria en la que
// falta, y quién está de guardia en ese mismo momento para poder cubrirle.
// Al confirmarlo, se avisa al sustituto por email + notificación en la app.
export async function crearCobertura(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede asignar coberturas.");
  }

  const schoolId = (formData.get("schoolId") as string)?.trim();
  const profesorAusenteId = (formData.get("profesorAusenteId") as string)?.trim();
  const profesorSustitutoId = (formData.get("profesorSustitutoId") as string)?.trim();
  const fechaRaw = formData.get("fecha") as string;
  const horaInicio = (formData.get("horaInicio") as string)?.trim();
  const horaFin = (formData.get("horaFin") as string)?.trim();
  const asignatura = (formData.get("asignatura") as string)?.trim() || null;
  const grupo = (formData.get("grupo") as string)?.trim() || null;
  const ubicacion = (formData.get("ubicacion") as string)?.trim() || null;

  if (!schoolId) throw new Error("Falta el centro.");
  if (!profesorAusenteId) throw new Error("Elige el profesor que falta.");
  if (!profesorSustitutoId) throw new Error("Elige quién va a cubrir la clase.");
  if (!fechaRaw || !horaInicio || !horaFin) throw new Error("Faltan la fecha y la hora.");

  const [ausente, sustituto] = await Promise.all([
    prisma.user.findUnique({ where: { id: profesorAusenteId }, select: { name: true, email: true } }),
    prisma.user.findUnique({ where: { id: profesorSustitutoId }, select: { name: true, email: true } }),
  ]);
  if (!ausente) throw new Error("No se ha encontrado al profesor ausente.");
  if (!sustituto) throw new Error("No se ha encontrado al profesor sustituto.");

  const fecha = new Date(`${fechaRaw}T00:00:00Z`);

  const cobertura = await prisma.coberturaGuardia.create({
    data: {
      schoolId,
      profesorAusenteId,
      profesorSustitutoId,
      fecha,
      horaInicio,
      horaFin,
      asignatura,
      grupo,
      ubicacion,
      estado: "ASIGNADA",
      creadoPorId: session.user.id,
    },
  });

  const ausenteNombre = ausente.name ?? ausente.email;
  const sustitutoNombre = sustituto.name ?? sustituto.email;

  await avisarSustituto({
    schoolId,
    coberturaId: cobertura.id,
    profesorSustitutoId,
    ausenteNombre,
    sustitutoNombre,
    sustitutoEmail: sustituto.email,
    asignatura,
    grupo,
    ubicacion,
    fecha,
    horaInicio,
    horaFin,
  });

  revalidatePath("/dashboard/guardias");
}

// Un profesor avisa de que no va a poder estar en unas horas concretas, y
// deja explicado qué tienen que hacer sus alumnos mientras tanto. Queda
// pendiente hasta que dirección le busque un sustituto.
export async function crearSolicitudCobertura(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const fechaRaw = formData.get("fecha") as string;
  const horaInicio = (formData.get("horaInicio") as string)?.trim();
  const horaFin = (formData.get("horaFin") as string)?.trim();
  const motivo = (formData.get("motivo") as string)?.trim();
  const trabajoAlumnos = (formData.get("trabajoAlumnos") as string)?.trim();

  if (!fechaRaw) throw new Error("Falta indicar la fecha.");
  if (!horaInicio || !horaFin) throw new Error("Elige en el calendario la franja en la que no vas a estar.");
  if (horaFin <= horaInicio) throw new Error("La hora de fin debe ser posterior a la de inicio.");
  if (!motivo) throw new Error("Indica el motivo de la ausencia.");
  if (!trabajoAlumnos) throw new Error("Explica qué tienen que hacer tus alumnos mientras no estás.");

  const fecha = new Date(`${fechaRaw}T00:00:00Z`);
  const schoolId = session.user.schoolId;

  // La asignatura, el grupo y el aula se cogen del bloque de horario que
  // más se solape con la franja elegida (puede que solo se pida cubrir
  // una parte de una clase de 2 horas, no la clase entera).
  const diaSemana = fecha.getUTCDay() === 0 ? 7 : fecha.getUTCDay();
  const bloquesDelDia = await prisma.horarioBloque.findMany({
    where: { profesorId: session.user.id, diaSemana, esGuardia: false },
  });
  const aMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const inicioMin = aMin(horaInicio);
  const finMin = aMin(horaFin);
  const bloqueSolapado = bloquesDelDia.find((b) => inicioMin < aMin(b.horaFin) && finMin > aMin(b.horaInicio));

  // Evita duplicados si se manda el formulario dos veces seguidas (por
  // ejemplo, por un doble clic mientras se procesaba el aviso anterior).
  const yaExiste = await prisma.coberturaGuardia.findFirst({
    where: { profesorAusenteId: session.user.id, fecha, horaInicio, horaFin, estado: "PENDIENTE" },
  });
  if (yaExiste) {
    throw new Error("Ya has avisado de esta ausencia; está pendiente de que dirección te busque un sustituto.");
  }

  const cobertura = await prisma.coberturaGuardia.create({
    data: {
      schoolId,
      profesorAusenteId: session.user.id,
      fecha,
      horaInicio,
      horaFin,
      asignatura: bloqueSolapado?.asignatura ?? null,
      grupo: bloqueSolapado?.grupo ?? null,
      ubicacion: bloqueSolapado?.aula ?? null,
      motivo,
      trabajoAlumnos,
      estado: "PENDIENTE",
      creadoPorId: session.user.id,
    },
  });

  const directivos = await prisma.user.findMany({
    where: { schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION"] } },
    select: { id: true, email: true },
  });

  const profesorNombre = session.user.name ?? session.user.email ?? "Un profesor";

  if (directivos.length > 0) {
    await notifyUsers(directivos.map((d) => d.id), {
      schoolId,
      tipo: "SOLICITUD_COBERTURA",
      titulo: "Un profesor ha avisado que falta",
      mensaje: `${profesorNombre} · ${horaInicio}–${horaFin}${bloqueSolapado?.grupo ? ` · ${bloqueSolapado.grupo}` : ""}`,
      link: `/dashboard/guardias?solicitud=${cobertura.id}`,
      relatedId: cobertura.id,
    });

    const destinatarios = directivos.map((d) => d.email).filter((e): e is string => Boolean(e));
    try {
      await sendSolicitudCoberturaEmail({
        to: destinatarios,
        profesorNombre,
        fecha,
        horaInicio,
        horaFin,
        trabajoAlumnos,
        motivo,
        asignatura: bloqueSolapado?.asignatura ?? null,
        grupo: bloqueSolapado?.grupo ?? null,
        aula: bloqueSolapado?.aula ?? null,
      });
    } catch {
      // No pasa nada si falla el email; la notificación en la app ya ha avisado.
    }
  }

  revalidatePath("/dashboard/guardias");
}

// Dirección resuelve una solicitud pendiente, eligiendo quién la cubre.
// Dirección acepta el aviso de ausencia (sin asignar sustituto todavía).
// A partir de aquí ya se puede "Gestionar guardia" para buscar a alguien.
export async function aceptarAusencia(coberturaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede aceptar un aviso de ausencia.");
  }

  const cobertura = await prisma.coberturaGuardia.findUnique({
    where: { id: coberturaId },
    include: { profesorAusente: { select: { name: true, email: true } } },
  });
  if (!cobertura) throw new Error("No se ha encontrado la solicitud.");
  if (cobertura.estado !== "PENDIENTE") throw new Error("Esta solicitud ya no está pendiente.");

  await prisma.coberturaGuardia.update({
    where: { id: coberturaId },
    data: { estado: "ACEPTADA" },
  });

  const ausenteNombre = cobertura.profesorAusente.name ?? cobertura.profesorAusente.email;

  await notifyUsers([cobertura.profesorAusenteId], {
    schoolId: cobertura.schoolId,
    tipo: "AUSENCIA_ACEPTADA",
    titulo: "Tu aviso de ausencia ha sido aceptado",
    mensaje: `${cobertura.horaInicio}–${cobertura.horaFin}${cobertura.grupo ? ` · ${cobertura.grupo}` : ""}`,
    link: "/dashboard/guardias",
    relatedId: cobertura.id,
  });

  try {
    if (cobertura.profesorAusente.email) {
      await sendAusenciaAceptadaEmail({
        to: cobertura.profesorAusente.email,
        ausenteNombre,
        fecha: cobertura.fecha,
        horaInicio: cobertura.horaInicio,
        horaFin: cobertura.horaFin,
      });
    }
  } catch {
    // No pasa nada si falla el email; la notificación en la app ya ha avisado.
  }

  revalidatePath("/dashboard/guardias");
}

// Marca el estado del justificante a mano (Recibido / Pendiente / No
// aplica), independientemente de si la ausencia ya está aceptada o no.
export async function actualizarEstadoJustificante(coberturaId: string, estado: "PENDIENTE" | "RECIBIDO" | "NO_ENTREGADO" | "NO_APLICA") {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede actualizar el justificante.");
  }

  const cobertura = await prisma.coberturaGuardia.findUnique({ where: { id: coberturaId } });
  if (!cobertura || cobertura.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la solicitud.");
  if (cobertura.estado === "PENDIENTE") {
    throw new Error("Primero hay que aceptar la ausencia antes de gestionar el justificante.");
  }

  await prisma.coberturaGuardia.update({
    where: { id: coberturaId },
    data: { estadoJustificante: estado },
  });

  revalidatePath("/dashboard/guardias");
}

// Sube el archivo del justificante (PDF/JPG/PNG) y marca el estado como
// Recibido automáticamente.
export async function subirJustificante(coberturaId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede subir un justificante.");
  }

  const cobertura = await prisma.coberturaGuardia.findUnique({
    where: { id: coberturaId },
    include: { school: { select: { name: true } }, profesorAusente: { select: { name: true, email: true } } },
  });
  if (!cobertura || cobertura.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la solicitud.");
  if (cobertura.estado === "PENDIENTE") {
    throw new Error("Primero hay que aceptar la ausencia antes de subir el justificante.");
  }

  const file = formData.get("justificante") as File | null;
  if (!file || file.size === 0) throw new Error("No se ha seleccionado ningún archivo.");
  const tiposPermitidos = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  if (!tiposPermitidos.includes(file.type)) {
    throw new Error("El justificante debe ser un PDF, JPG o PNG.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("El archivo no puede pesar más de 8 MB.");
  }

  const supabase = getSupabaseAdmin();
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${cobertura.schoolId}/${coberturaId}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(JUSTIFICANTES_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    throw new Error(`No se pudo subir el justificante: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(JUSTIFICANTES_BUCKET).getPublicUrl(path);

  // Copia también en Google Drive, en su propia carpeta por centro — igual
  // que ya hacemos con las copias de seguridad en Excel. Si Drive falla
  // por lo que sea, no bloqueamos la subida real (ya guardada en Supabase,
  // que es lo que usa la propia app para mostrar el archivo).
  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
    if (rootFolderId) {
      const ausenteNombre = cobertura.profesorAusente.name ?? cobertura.profesorAusente.email;
      const fechaCorta = cobertura.fecha.toISOString().slice(0, 10);
      const schoolFolderId = await ensureSubfolder(rootFolderId, safeFileName(cobertura.school.name));
      const justificantesFolderId = await ensureSubfolder(schoolFolderId, "Justificantes Ausencias");
      const nombreArchivo = `${safeFileName(ausenteNombre)} - ${fechaCorta}.${ext}`;
      await uploadGenericFileToDrive(justificantesFolderId, nombreArchivo, Buffer.from(bytes), file.type);
    }
  } catch (e) {
    console.error("No se pudo copiar el justificante en Google Drive:", e);
  }

  await prisma.coberturaGuardia.update({
    where: { id: coberturaId },
    data: {
      justificanteUrl: data.publicUrl,
      justificanteNombre: file.name,
      justificanteFecha: new Date(),
      estadoJustificante: "RECIBIDO",
    },
  });

  revalidatePath("/dashboard/guardias");
}

export async function asignarSustitutoCobertura(coberturaId: string, profesorSustitutoId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede asignar quién cubre una guardia.");
  }

  const cobertura = await prisma.coberturaGuardia.findUnique({
    where: { id: coberturaId },
    include: { profesorAusente: { select: { name: true, email: true } } },
  });
  if (!cobertura) throw new Error("No se ha encontrado la solicitud.");
  if (cobertura.estado === "PENDIENTE") {
    throw new Error("Primero tienes que aceptar el aviso de ausencia, antes de buscar sustituto.");
  }

  const sustituto = await prisma.user.findUnique({ where: { id: profesorSustitutoId }, select: { name: true, email: true } });
  if (!sustituto) throw new Error("No se ha encontrado al profesor sustituto.");

  await prisma.coberturaGuardia.update({
    where: { id: coberturaId },
    data: { profesorSustitutoId, estado: "ASIGNADA" },
  });

  const ausenteNombre = cobertura.profesorAusente.name ?? cobertura.profesorAusente.email;
  const sustitutoNombre = sustituto.name ?? sustituto.email;

  await avisarSustituto({
    schoolId: cobertura.schoolId,
    coberturaId: cobertura.id,
    profesorSustitutoId,
    ausenteNombre,
    sustitutoNombre,
    sustitutoEmail: sustituto.email,
    asignatura: cobertura.asignatura,
    grupo: cobertura.grupo,
    ubicacion: cobertura.ubicacion,
    trabajoAlumnos: cobertura.trabajoAlumnos,
    fecha: cobertura.fecha,
    horaInicio: cobertura.horaInicio,
    horaFin: cobertura.horaFin,
  });

  // También avisamos al profesor que estaba ausente, para que sepa quién
  // le está cubriendo y pueda contactar con esa persona si hace falta.
  await notifyUsers([cobertura.profesorAusenteId], {
    schoolId: cobertura.schoolId,
    tipo: "COBERTURA_RESUELTA",
    titulo: "Ya tienes quien te cubra",
    mensaje: `${sustitutoNombre} cubrirá tu ausencia del ${cobertura.horaInicio}–${cobertura.horaFin}`,
    link: "/dashboard/guardias",
    relatedId: cobertura.id,
  });

  try {
    if (cobertura.profesorAusente.email) {
      await sendCoberturaResueltaEmail({
        to: cobertura.profesorAusente.email,
        ausenteNombre,
        sustitutoNombre,
        sustitutoEmail: sustituto.email,
        fecha: cobertura.fecha,
        horaInicio: cobertura.horaInicio,
        horaFin: cobertura.horaFin,
      });
    }
  } catch {
    // No pasa nada si falla el email; la notificación en la app ya ha avisado.
  }

  revalidatePath("/dashboard/guardias");
}

// Dirección rechaza una solicitud pendiente (por ejemplo, si no hay nadie
// disponible o no procede). Avisa al profesor que la mandó.
export async function rechazarSolicitud(coberturaId: string, motivoRechazo: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede rechazar una solicitud.");
  }

  const motivo = motivoRechazo?.trim();
  if (!motivo) throw new Error("Indica el motivo del rechazo, para que el profesor lo sepa.");

  const cobertura = await prisma.coberturaGuardia.findUnique({
    where: { id: coberturaId },
    include: { profesorAusente: { select: { name: true, email: true } } },
  });
  if (!cobertura) throw new Error("No se ha encontrado la solicitud.");
  if (cobertura.estado !== "PENDIENTE") throw new Error("Esta solicitud ya no está pendiente.");

  await prisma.coberturaGuardia.update({
    where: { id: coberturaId },
    data: { estado: "RECHAZADA", motivoRechazo: motivo },
  });

  const ausenteNombre = cobertura.profesorAusente.name ?? cobertura.profesorAusente.email;

  await notifyUsers([cobertura.profesorAusenteId], {
    schoolId: cobertura.schoolId,
    tipo: "SOLICITUD_RECHAZADA",
    titulo: "Tu aviso de ausencia ha sido rechazado",
    mensaje: `${cobertura.horaInicio}–${cobertura.horaFin}${cobertura.grupo ? ` · ${cobertura.grupo}` : ""} · ${motivo}`,
    link: "/dashboard/guardias",
    relatedId: cobertura.id,
  });

  try {
    if (cobertura.profesorAusente.email) {
      await sendSolicitudRechazadaEmail({
        to: cobertura.profesorAusente.email,
        ausenteNombre,
        fecha: cobertura.fecha,
        horaInicio: cobertura.horaInicio,
        horaFin: cobertura.horaFin,
        motivoRechazo: motivo,
      });
    }
  } catch {
    // No pasa nada si falla el email; la notificación en la app ya ha avisado.
  }

  revalidatePath("/dashboard/guardias");
}

// Solicitudes de cobertura, para la pantalla de "Solicitudes de ausencia"
// que ve dirección — trae todas (no solo pendientes) para poder ofrecer
// las pestañas Pendientes/Aceptadas/Rechazadas/Todas.
export async function obtenerSolicitudesPendientes(schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) return [];

  const schoolId = schoolIdParam ?? session.user.schoolId;
  if (!schoolId) return [];

  const solicitudes = await prisma.coberturaGuardia.findMany({
    where: { schoolId },
    include: {
      profesorAusente: { select: { id: true, name: true, email: true, avatarUrl: true } },
      profesorSustituto: { select: { id: true, name: true, email: true } },
    },
    orderBy: { fecha: "asc" },
  });

  return solicitudes.map((s) => ({
    id: s.id,
    estado: s.estado,
    profesorAusenteId: s.profesorAusenteId,
    profesorAusenteNombre: s.profesorAusente.name ?? s.profesorAusente.email,
    profesorAusenteAvatarUrl: s.profesorAusente.avatarUrl,
    fecha: s.fecha.toISOString(),
    horaInicio: s.horaInicio,
    horaFin: s.horaFin,
    asignatura: s.asignatura,
    grupo: s.grupo,
    ubicacion: s.ubicacion,
    motivo: s.motivo,
    trabajoAlumnos: s.trabajoAlumnos,
    estadoJustificante: s.estadoJustificante,
    justificanteUrl: s.justificanteUrl,
    justificanteNombre: s.justificanteNombre,
    justificanteFecha: s.justificanteFecha ? s.justificanteFecha.toISOString() : null,
    profesorSustitutoId: s.profesorSustitutoId,
    profesorSustitutoNombre: s.profesorSustituto ? (s.profesorSustituto.name ?? s.profesorSustituto.email) : null,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function updateGuardiaStatus(id: string, status: GuardiaStatus) {
  const session = await getServerSession(authOptions);
  if (!esDirectivo(session?.user.role)) throw new Error("No autorizado.");

  await prisma.guardia.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/guardias");
  revalidatePath("/dashboard");
}

// Para rellenar el formulario de edición con los datos reales (no los ya
// formateados/combinados que se usan solo para pintar la tabla).
export async function obtenerGuardiaProgramadaParaEditar(id: string, origen: "guardia" | "cobertura") {
  const session = await getServerSession(authOptions);
  if (!esDirectivo(session?.user.role)) throw new Error("No autorizado.");

  if (origen === "guardia") {
    const g = await prisma.guardia.findUnique({ where: { id } });
    if (!g) throw new Error("No se ha encontrado la guardia.");
    return {
      origen: "guardia" as const,
      id: g.id,
      fecha: g.fecha.toISOString().slice(0, 10),
      hora: g.fecha.toISOString().slice(11, 16),
      turno: g.turno,
      ubicacion: g.ubicacion ?? "",
      grupo: g.grupo ?? "",
      tarea: g.tarea ?? "",
    };
  }

  const c = await prisma.coberturaGuardia.findUnique({ where: { id } });
  if (!c) throw new Error("No se ha encontrado la cobertura.");
  return {
    origen: "cobertura" as const,
    id: c.id,
    fecha: c.fecha.toISOString().slice(0, 10),
    horaInicio: c.horaInicio,
    horaFin: c.horaFin,
    ubicacion: c.ubicacion ?? "",
    grupo: c.grupo ?? "",
    asignatura: c.asignatura ?? "",
    trabajoAlumnos: c.trabajoAlumnos ?? "",
    profesorSustitutoId: c.profesorSustitutoId ?? "",
  };
}

// Dirección modifica una guardia ya asignada (de cualquiera de los dos
// orígenes) y se avisa por email al profesor que la tiene asignada.
export async function actualizarGuardiaProgramada(
  id: string,
  origen: "guardia" | "cobertura",
  formData: FormData
) {
  const session = await getServerSession(authOptions);
  if (!esDirectivo(session?.user.role)) throw new Error("No autorizado.");

  const ubicacion = ((formData.get("ubicacion") as string) || "").trim() || null;
  const grupo = ((formData.get("grupo") as string) || "").trim() || null;
  const fechaRaw = (formData.get("fecha") as string)?.trim();
  if (!fechaRaw) throw new Error("Falta la fecha.");

  if (origen === "guardia") {
    const turno = ((formData.get("turno") as string) || "").trim();
    const hora = ((formData.get("hora") as string) || "").trim();
    const tarea = ((formData.get("tarea") as string) || "").trim() || null;
    if (!turno) throw new Error("El turno es obligatorio.");
    if (!hora) throw new Error("La hora es obligatoria.");

    const fecha = new Date(`${fechaRaw}T${hora}:00`);
    if (Number.isNaN(fecha.getTime())) throw new Error("Fecha u hora no válidas.");

    const guardia = await prisma.guardia.update({
      where: { id },
      data: { turno, ubicacion, grupo, tarea, fecha },
      include: { profesor: { select: { name: true, email: true } } },
    });

    try {
      await sendGuardiaModificadaEmail({
        to: guardia.profesor.email,
        profesorName: guardia.profesor.name ?? guardia.profesor.email,
        turno,
        ubicacion,
        grupo,
        tarea,
        fecha,
      });
    } catch {
      // La guardia ya se ha actualizado; si falla el email no revertimos nada.
    }
  } else {
    const horaInicio = ((formData.get("horaInicio") as string) || "").trim();
    const horaFin = ((formData.get("horaFin") as string) || "").trim();
    const asignatura = ((formData.get("asignatura") as string) || "").trim() || null;
    const trabajoAlumnos = ((formData.get("trabajoAlumnos") as string) || "").trim() || null;
    const nuevoSustitutoId = ((formData.get("profesorSustitutoId") as string) || "").trim() || null;
    if (!horaInicio || !horaFin) throw new Error("Las horas son obligatorias.");
    if (horaFin <= horaInicio) throw new Error("La hora de fin debe ser posterior a la de inicio.");

    const fecha = new Date(`${fechaRaw}T00:00:00Z`);

    const anterior = await prisma.coberturaGuardia.findUnique({
      where: { id },
      include: { profesorSustituto: { select: { id: true, name: true, email: true } } },
    });
    if (!anterior) throw new Error("No se ha encontrado la cobertura.");

    const cambiaSustituto = nuevoSustitutoId && nuevoSustitutoId !== anterior.profesorSustitutoId;

    const cobertura = await prisma.coberturaGuardia.update({
      where: { id },
      data: {
        horaInicio,
        horaFin,
        ubicacion,
        grupo,
        asignatura,
        trabajoAlumnos,
        fecha,
        ...(cambiaSustituto ? { profesorSustitutoId: nuevoSustitutoId } : {}),
      },
      include: {
        profesorSustituto: { select: { name: true, email: true } },
        profesorAusente: { select: { name: true } },
      },
    });

    if (cambiaSustituto) {
      // Al profesor sustituto anterior: ya no hace falta que vaya.
      if (anterior.profesorSustituto?.email) {
        try {
          await sendCoberturaEliminadaEmail({
            to: anterior.profesorSustituto.email,
            sustitutoNombre: anterior.profesorSustituto.name ?? anterior.profesorSustituto.email,
            ausenteNombre: cobertura.profesorAusente?.name ?? "otro profesor",
            fecha,
            horaInicio,
            horaFin,
          });
        } catch {
          // No bloqueamos por un fallo de email.
        }
      }
      // Al profesor sustituto nuevo: toda la información, como si fuera
      // una asignación nueva.
      if (cobertura.profesorSustituto?.email) {
        try {
          await avisarSustituto({
            schoolId: cobertura.schoolId,
            coberturaId: cobertura.id,
            profesorSustitutoId: nuevoSustitutoId!,
            ausenteNombre: cobertura.profesorAusente?.name ?? "otro profesor",
            sustitutoNombre: cobertura.profesorSustituto.name ?? cobertura.profesorSustituto.email,
            sustitutoEmail: cobertura.profesorSustituto.email,
            asignatura,
            grupo,
            ubicacion,
            trabajoAlumnos,
            fecha,
            horaInicio,
            horaFin,
          });
        } catch {
          // No bloqueamos por un fallo de email.
        }
      }
    } else if (cobertura.profesorSustituto?.email) {
      // Mismo sustituto: solo avisamos de que han cambiado datos.
      try {
        await sendCoberturaModificadaEmail({
          to: cobertura.profesorSustituto.email,
          sustitutoNombre: cobertura.profesorSustituto.name ?? cobertura.profesorSustituto.email,
          ausenteNombre: cobertura.profesorAusente?.name ?? "otro profesor",
          asignatura,
          grupo,
          ubicacion,
          trabajoAlumnos,
          fecha,
          horaInicio,
          horaFin,
        });
      } catch {
        // La cobertura ya se ha actualizado; si falla el email no revertimos nada.
      }
    }
  }

  revalidatePath("/dashboard/guardias");
  revalidatePath("/dashboard");
}

// Dirección elimina una guardia ya asignada (de cualquiera de los dos
// orígenes) y se avisa por email al profesor que la tenía asignada.
export async function eliminarGuardiaProgramada(id: string, origen: "guardia" | "cobertura") {
  const session = await getServerSession(authOptions);
  if (!esDirectivo(session?.user.role)) throw new Error("No autorizado.");

  if (origen === "guardia") {
    const guardia = await prisma.guardia.delete({
      where: { id },
      include: { profesor: { select: { name: true, email: true } } },
    });

    try {
      await sendGuardiaEliminadaEmail({
        to: guardia.profesor.email,
        profesorName: guardia.profesor.name ?? guardia.profesor.email,
        turno: guardia.turno,
        fecha: guardia.fecha,
      });
    } catch {
      // La guardia ya se ha borrado; si falla el email no revertimos nada.
    }
  } else {
    const cobertura = await prisma.coberturaGuardia.delete({
      where: { id },
      include: {
        profesorSustituto: { select: { name: true, email: true } },
        profesorAusente: { select: { name: true } },
      },
    });

    if (cobertura.profesorSustituto?.email) {
      try {
        await sendCoberturaEliminadaEmail({
          to: cobertura.profesorSustituto.email,
          sustitutoNombre: cobertura.profesorSustituto.name ?? cobertura.profesorSustituto.email,
          ausenteNombre: cobertura.profesorAusente?.name ?? "otro profesor",
          fecha: cobertura.fecha,
          horaInicio: cobertura.horaInicio,
          horaFin: cobertura.horaFin,
        });
      } catch {
        // La cobertura ya se ha borrado; si falla el email no revertimos nada.
      }
    }
  }

  revalidatePath("/dashboard/guardias");
  revalidatePath("/dashboard");
}

// Las solicitudes que ha mandado el propio profesor y siguen pendientes,
// para que las vea reflejadas en su propio panel mientras espera a que
// dirección le busque un sustituto.
// Las solicitudes que ha mandado el propio profesor y siguen pendientes,
// o que le han rechazado (para que lo vea reflejado en su propio panel).
export async function obtenerMisSolicitudesPendientes() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];

  const solicitudes = await prisma.coberturaGuardia.findMany({
    where: { profesorAusenteId: session.user.id, estado: { in: ["PENDIENTE", "RECHAZADA"] } },
    orderBy: { fecha: "asc" },
  });

  return solicitudes.map((s) => ({
    id: s.id,
    fecha: s.fecha.toISOString(),
    horaInicio: s.horaInicio,
    horaFin: s.horaFin,
    asignatura: s.asignatura,
    grupo: s.grupo,
    estado: s.estado as "PENDIENTE" | "RECHAZADA",
  }));
}

// Historial de guardias ya resueltas para un profesor: tanto las que ha
// cubierto él a otros, como las que otros le han cubierto a él. También
// lo usa el equipo directivo para ver su propio historial personal.
export async function obtenerMisCoberturas(profesorIdConsultado?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { cubiertas: [], recibidas: [] };

  // Un profesor solo puede ver las suyas propias; dirección/SuperAdmin
  // pueden consultar las de cualquier profesor del centro.
  const profesorId =
    profesorIdConsultado && esDirectivo(session.user.role) ? profesorIdConsultado : session.user.id;

  const [cubiertas, recibidas] = await Promise.all([
    prisma.coberturaGuardia.findMany({
      where: { profesorSustitutoId: profesorId, estado: "ASIGNADA" },
      include: { profesorAusente: { select: { name: true, email: true } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.coberturaGuardia.findMany({
      where: { profesorAusenteId: profesorId, estado: "ASIGNADA" },
      include: { profesorSustituto: { select: { name: true, email: true } } },
      orderBy: { fecha: "desc" },
    }),
  ]);

  return {
    cubiertas: cubiertas.map((c) => ({
      id: c.id,
      otroNombre: c.profesorAusente.name ?? c.profesorAusente.email,
      fecha: c.fecha.toISOString(),
      horaInicio: c.horaInicio,
      horaFin: c.horaFin,
      asignatura: c.asignatura,
      grupo: c.grupo,
      ubicacion: c.ubicacion,
      estado: "ASIGNADA" as const,
    })),
    recibidas: recibidas.map((c) => ({
      id: c.id,
      otroNombre: c.profesorSustituto?.name ?? c.profesorSustituto?.email ?? "—",
      fecha: c.fecha.toISOString(),
      horaInicio: c.horaInicio,
      horaFin: c.horaFin,
      asignatura: c.asignatura,
      grupo: c.grupo,
      ubicacion: c.ubicacion,
      estado: "ASIGNADA" as const,
    })),
  };
}

// Lista de profesores/directivo del centro, para el buscador que usa
// dirección y SuperAdmin al consultar el historial de otra persona.
export async function obtenerProfesoresDelCentro(schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) return [];

  const schoolId = schoolIdParam ?? session.user.schoolId;
  if (!schoolId) return [];

  const profesores = await prisma.user.findMany({
    where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return profesores.map((p) => ({ id: p.id, nombre: p.name ?? p.email }));
}

export async function createGuardia(formData: FormData) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO" && role !== "ADMINISTRACION")) {
    throw new Error("No autorizado.");
  }

  const schoolId = (formData.get("schoolId") as string)?.trim();
  const profesorId = (formData.get("profesorId") as string)?.trim();
  const turno = (formData.get("turno") as string)?.trim();
  const ubicacion = (formData.get("ubicacion") as string)?.trim();
  const grupo = (formData.get("grupo") as string)?.trim();
  const tarea = (formData.get("tarea") as string)?.trim();
  const fechaRaw = formData.get("fecha") as string;
  const horaRaw = formData.get("hora") as string;

  if (!schoolId) throw new Error("Falta el centro.");
  if (!profesorId) throw new Error("Elige el profesor al que asignar la guardia.");
  if (!turno) throw new Error("El turno es obligatorio.");
  if (!ubicacion) throw new Error("El aula/ubicación es obligatoria.");
  if (!grupo) throw new Error("El grupo es obligatorio.");
  if (!fechaRaw) throw new Error("La fecha es obligatoria.");
  if (!horaRaw) throw new Error("La hora es obligatoria.");

  const fecha = new Date(`${fechaRaw}T${horaRaw}:00`);
  if (Number.isNaN(fecha.getTime())) throw new Error("Fecha u hora no válidas.");

  const profesor = await prisma.user.findUnique({
    where: { id: profesorId },
    select: { name: true, email: true },
  });
  if (!profesor) throw new Error("No se ha encontrado el profesor.");

  await prisma.guardia.create({
    data: {
      schoolId,
      profesorId,
      turno,
      ubicacion: ubicacion || null,
      grupo: grupo || null,
      tarea: tarea || null,
      fecha,
    },
  });

  revalidatePath("/dashboard/guardias");
  revalidatePath("/dashboard");

  // El email y el evento de Teams son "mejor esfuerzo": si Microsoft o el
  // correo fallan, la guardia YA se ha guardado correctamente y no queremos
  // que el usuario vea un error como si no se hubiera creado. Cada aviso
  // se intenta por separado para que un fallo no tumbe al otro.
  const profesorNombre = profesor.name ?? profesor.email;
  const avisos: { canal: string; ok: boolean; error?: string }[] = [];

  try {
    await sendGuardiaEmail({
      to: profesor.email,
      profesorName: profesorNombre,
      turno,
      ubicacion: ubicacion || null,
      grupo: grupo || null,
      tarea: tarea || null,
      fecha,
    });
    avisos.push({ canal: "email", ok: true });
  } catch (e) {
    avisos.push({ canal: "email", ok: false, error: e instanceof Error ? e.message : "Error desconocido" });
  }

  try {
    const [horas, minutos] = horaRaw.split(":").map(Number);
    const finGuardia = new Date(fecha);
    finGuardia.setHours(horas, minutos + 55); // guardia de 55 min por defecto, como una clase
    await createTeamsCalendarEvent({
      userEmail: profesor.email,
      subject: `Guardia: ${turno}`,
      bodyHtml: `Guardia asignada.${grupo ? ` Grupo: ${grupo}.` : ""}${ubicacion ? ` Aula: ${ubicacion}.` : ""}${tarea ? ` Tarea: ${tarea}.` : ""}`,
      start: fecha,
      end: finGuardia,
      location: ubicacion || undefined,
    });
    avisos.push({ canal: "teams", ok: true });
  } catch (e) {
    avisos.push({ canal: "teams", ok: false, error: e instanceof Error ? e.message : "Error desconocido" });
  }

  return { avisos };
}
