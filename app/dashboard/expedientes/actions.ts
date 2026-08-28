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
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
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
  const lugar = (formData.get("lugar") as string)?.trim();
  const observaciones = (formData.get("observaciones") as string)?.trim();
  const medidasAplicadas = (formData.get("medidasAplicadas") as string)?.trim();
  // Cuando la incidencia se crea desde el asistente de "Obrir expedient",
  // ya se está abriendo el expediente en el mismo paso — no tiene sentido
  // avisar de "ha llegado a 3 incidencias, revisa si hay que abrir
  // expediente" si el expediente ya se está abriendo ahora mismo.
  const esParteDeExpediente = formData.get("esParteDeExpediente") === "true";

  if (!alumnoId) throw new Error("Elige el alumno.");
  if (!tutorId) throw new Error("Elige el tutor responsable.");
  if (!tipoIncidencia) throw new Error("Indica el tipo de incidencia.");
  if (!fechaRaw) throw new Error("Indica la fecha.");
  if (!descripcion) throw new Error("Añade una descripción.");
  if (!lugar) throw new Error("El lugar es obligatorio.");
  if (!observaciones) throw new Error("Las observaciones son obligatorias.");
  if (!medidasAplicadas) throw new Error("Las medidas aplicadas son obligatorias.");

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
      lugar,
      descripcion,
      observaciones,
      medidasAplicadas,
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
  // tutor (o tutores, si ha tenido varios) + al coordinador/es del
  // departamento al que pertenece el tutor + Admin. de Centro/SuperAdmin
  // del centro (dirección general, siempre informada de esto).
  const totalIncidenciasAlumno = await prisma.incidencia.count({ where: { alumnoId } });
  if (totalIncidenciasAlumno === 3 && !esParteDeExpediente) {
    const [tutoresPrevios, departamentosTutor, adminCentro] = await Promise.all([
      prisma.incidencia.findMany({
        where: { alumnoId },
        select: { tutorId: true },
        distinct: ["tutorId"],
      }),
      prisma.departamento.findMany({
        where: { schoolId: session.user.schoolId, profesores: { some: { id: tutorId } } },
        select: { coordinadores: { select: { id: true, email: true } } },
      }),
      prisma.user.findMany({
        where: { schoolId: session.user.schoolId, role: { in: ["ADMIN_CENTRO", "SUPERADMIN"] } },
        select: { id: true, email: true },
      }),
    ]);

    const coordinadoresDepartamento = departamentosTutor.flatMap((d) => d.coordinadores);

    const idsAvisar = Array.from(
      new Set([
        ...tutoresPrevios.map((t) => t.tutorId),
        ...coordinadoresDepartamento.map((c) => c.id),
        ...adminCentro.map((d) => d.id),
      ])
    );

    await notifyUsers(idsAvisar, {
      schoolId: session.user.schoolId,
      tipo: "TRES_INCIDENCIAS",
      titulo: "3 incidencias registradas",
      mensaje: `${alumno.nombre} (${alumno.curso}) ha llegado a 3 incidencias. Revisa si procede abrir expediente.`,
      link: "/dashboard/expedientes?vista=expedientes",
      relatedId: alumnoId,
    });

    const emails = new Set<string>();
    adminCentro.forEach((d) => d.email && emails.add(d.email));
    coordinadoresDepartamento.forEach((c) => c.email && emails.add(c.email));
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
  const lugar = (formData.get("lugar") as string)?.trim();
  const observaciones = (formData.get("observaciones") as string)?.trim();
  const medidasAplicadas = (formData.get("medidasAplicadas") as string)?.trim();
  if (!lugar) throw new Error("El lugar es obligatorio.");
  if (!observaciones) throw new Error("Las observaciones son obligatorias.");
  if (!medidasAplicadas) throw new Error("Las medidas aplicadas son obligatorias.");
  const familiaInformada = formData.get("familiaInformada") === "on";
  const eraFamiliaInformada = permiso.incidencia!.familiaInformada;

  await prisma.incidencia.update({
    where: { id },
    data: {
      tutorId: tutorId || undefined,
      tipoIncidencia: tipoIncidencia || undefined,
      prioridad: prioridad || undefined,
      fecha: fechaRaw ? new Date(fechaRaw) : undefined,
      lugar,
      descripcion: descripcion || undefined,
      observaciones,
      medidasAplicadas,
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

  if ((estado === "EN_SEGUIMIENTO" || estado === "CERRADA") && !permiso.incidencia.familiaInformada) {
    throw new Error(
      estado === "CERRADA"
        ? "No puedes cerrar esta incidencia sin informar antes a la familia. Edita la incidencia y marca la casilla \"Familia informada\"."
        : "No puedes marcar esta incidencia en seguimiento sin informar antes a la familia. Edita la incidencia y marca la casilla \"Familia informada\"."
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

    // Aviso cada vez que se llega a un múltiplo de 3 incidencias CERRADAS
    // de ese alumno (3, 6, 9...), tanto al equipo directivo como a los
    // tutores que ha tenido: email + notificación.
    const totalCerradas = await prisma.incidencia.count({
      where: { alumnoId: permiso.incidencia.alumnoId, estado: "CERRADA" },
    });

    if (totalCerradas > 0 && totalCerradas % 3 === 0) {
      const alumno = await prisma.alumno.findUnique({
        where: { id: permiso.incidencia.alumnoId },
        select: { nombre: true, curso: true },
      });

      const [tutoresPrevios, directivos] = await Promise.all([
        prisma.incidencia.findMany({
          where: { alumnoId: permiso.incidencia.alumnoId },
          select: { tutor: { select: { id: true, email: true } } },
          distinct: ["tutorId"],
        }),
        prisma.user.findMany({
          where: { schoolId: permiso.incidencia.schoolId, role: { in: ["COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION"] } },
          select: { id: true, email: true },
        }),
      ]);

      const idsAvisar = Array.from(new Set([...tutoresPrevios.map((t) => t.tutor.id), ...directivos.map((d) => d.id)]));

      if (alumno) {
        await notifyUsers(idsAvisar, {
          schoolId: permiso.incidencia.schoolId,
          tipo: "INCIDENCIAS_CERRADAS",
          titulo: `${totalCerradas} incidencias cerradas`,
          mensaje: `${alumno.nombre} (${alumno.curso}) ya lleva ${totalCerradas} incidencias cerradas.`,
          link: "/dashboard/expedientes",
          relatedId: permiso.incidencia.alumnoId,
        });

        const emails = new Set<string>();
        directivos.forEach((d) => d.email && emails.add(d.email));
        tutoresPrevios.forEach((t) => t.tutor.email && emails.add(t.tutor.email));

        try {
          const { sendIncidenciasCerradasEmail } = await import("@/lib/email");
          await sendIncidenciasCerradasEmail({
            to: Array.from(emails),
            alumnoNombre: alumno.nombre,
            curso: alumno.curso,
            cantidad: totalCerradas,
          });
        } catch {
          // El aviso en la app ya ha quedado registrado igualmente.
        }
      }
    }
  }

  revalidatePath("/dashboard/expedientes");
}

export async function eliminarIncidencia(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede eliminar expedientes.");
  }

  await prisma.expediente.deleteMany({ where: { incidenciaId: id } });
  await prisma.incidencia.delete({ where: { id } });
  revalidatePath("/dashboard/expedientes");
}

function textoRequerido(formData: FormData, campo: string, etiqueta: string) {
  const raw = (formData.get(campo) as string)?.trim();
  if (!raw) throw new Error(`El campo "${etiqueta}" es obligatorio.`);
  return raw;
}

function fechaRequerida(formData: FormData, campo: string, etiqueta: string) {
  const raw = formData.get(campo) as string;
  if (!raw) throw new Error(`El campo "${etiqueta}" es obligatorio.`);
  return new Date(`${raw}T00:00:00`);
}

async function generarNumeroExpediente() {
  const total = await prisma.expediente.count();
  return (total + 1).toString().padStart(6, "0");
}

function extraerCamposExpediente(formData: FormData) {
  const diasRaw = Number(formData.get("sancionDias"));
  if (!diasRaw || diasRaw < 1) throw new Error('El campo "Días de expulsión" es obligatorio.');

  const fechaAplicacionInicio = fechaRequerida(formData, "fechaAplicacionInicio", "Data d'aplicació (inici)");

  // La fecha de vuelta no se confía tal cual del cliente: se recalcula
  // aquí mismo a partir de los días de expulsión + la fecha de inicio, así
  // no puede haber un rango distinto al que de verdad se ha puesto.
  const fechaAplicacionFin = new Date(fechaAplicacionInicio);
  fechaAplicacionFin.setDate(fechaAplicacionFin.getDate() + diasRaw);

  return {
    fechaInicio: fechaRequerida(formData, "fechaInicio", "Data d'obertura"),
    fets: textoRequerido(formData, "fets", "Fets que motiven l'obertura"),
    testimonis: textoRequerido(formData, "testimonis", "Testimonis i proves"),
    informeTutor: textoRequerido(formData, "informeTutor", "Informe del tutor/a"),
    audienciaResumen: textoRequerido(formData, "audienciaResumen", "Audiència a l'alumne"),
    valoracionComision: textoRequerido(formData, "valoracionComision", "Valoració de la Comissió"),
    medidasProvisionales: textoRequerido(formData, "medidasProvisionales", "Mesures provisionals"),
    sancionDias: diasRaw,
    sancionMotivo: textoRequerido(formData, "sancionMotivo", "Motiu del part"),
    fechaAplicacionInicio,
    fechaAplicacionFin,
    recursoEstado: textoRequerido(formData, "recursoEstado", "Informació sobre recursos"),
    direccionNombre: textoRequerido(formData, "direccionNombre", "Direcció del centre"),
    coordinadorNombre: textoRequerido(formData, "coordinadorNombre", "Coordinador de Departament"),
  };
}

// Se pueden crear varios expedientes para el mismo alumno/incidencia a lo
// largo del tiempo (uno debajo de otro en la lista); cada clic en "Nuevo
// expediente" crea uno más, no sobrescribe el anterior.
export async function crearExpediente(formData: FormData) {
  const incidenciaId = formData.get("incidenciaId") as string;
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    throw new Error("No autorizado.");
  }

  const incidencia = await prisma.incidencia.findUnique({ where: { id: incidenciaId } });
  if (!incidencia) throw new Error("No se ha encontrado la incidencia.");

  const campos = extraerCamposExpediente(formData);
  const numero = await generarNumeroExpediente();

  const expediente = await prisma.expediente.create({
    data: {
      schoolId: incidencia.schoolId,
      alumnoId: incidencia.alumnoId,
      incidenciaId,
      tutorId: incidencia.tutorId,
      creadoPorId: session.user.id,
      numero,
      ...campos,
    },
  });

  await prisma.incidenciaEvento.create({
    data: {
      incidenciaId,
      tipo: "EXPEDIENTE_CREADO",
      descripcion: `Expediente ${numero} creado (borrador, sin enviar todavía)`,
      autorId: session.user.id,
    },
  });

  revalidatePath("/dashboard/expedientes");
  return { id: expediente.id };
}

export async function actualizarExpediente(formData: FormData) {
  const id = formData.get("id") as string;
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    throw new Error("No autorizado.");
  }

  const expediente = await prisma.expediente.findUnique({ where: { id } });
  if (!expediente) throw new Error("No se ha encontrado el expediente.");
  if (expediente.estado === "ENVIADO") {
    throw new Error("Este expediente ya se ha enviado al tutor y no se puede editar.");
  }

  const campos = extraerCamposExpediente(formData);
  await prisma.expediente.update({ where: { id }, data: campos });

  await prisma.incidenciaEvento.create({
    data: {
      incidenciaId: expediente.incidenciaId,
      tipo: "EXPEDIENTE_EDITADO",
      descripcion: `Expediente ${expediente.numero} editado`,
      autorId: session.user.id,
    },
  });

  revalidatePath("/dashboard/expedientes");
}

// Envía el expediente ya redactado al tutor: email con toda la información
// + el PDF adjunto, y notificación en la app. Solo Coordinación, Dirección
// o SuperAdmin pueden darle a enviar.
export async function enviarExpediente(formData: FormData) {
  const id = formData.get("id") as string;
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    throw new Error("No autorizado.");
  }

  const firmaDireccion = formData.get("firmaDireccion") as string;
  const firmaTutor = formData.get("firmaTutor") as string;
  const firmaCoordinador = formData.get("firmaCoordinador") as string;
  const firmaAlumno = formData.get("firmaAlumno") as string;
  const emailAlumno = (formData.get("emailAlumno") as string)?.trim() || null;

  if (!firmaDireccion || !firmaTutor || !firmaCoordinador || !firmaAlumno) {
    throw new Error("Faltan firmas: hacen falta las de Dirección, Tutor/a, Coordinador/a y del alumno/a antes de enviar.");
  }

  const expediente = await prisma.expediente.findUnique({ where: { id } });
  if (!expediente) throw new Error("No se ha encontrado el expediente.");
  if (expediente.estado === "ENVIADO") throw new Error("Este expediente ya se había enviado.");

  await prisma.expediente.update({
    where: { id },
    data: { firmaDireccion, firmaTutor, firmaCoordinador, firmaAlumno, emailAlumno },
  });

  const { getExpedienteData, buildExpedientePdf } = await import("@/lib/expedienteDocs");
  const { sendExpedienteEmail } = await import("@/lib/email");

  const data = await getExpedienteData(id);
  if (!data) throw new Error("No se pudo generar el expediente.");

  const tutor = await prisma.user.findUnique({ where: { id: expediente.tutorId }, select: { name: true, email: true } });
  const pdfBytes = await buildExpedientePdf(data);

  const destinatarios = [tutor?.email, emailAlumno].filter((e): e is string => Boolean(e));
  if (destinatarios.length > 0) {
    await sendExpedienteEmail({
      to: destinatarios,
      tutorNombre: tutor?.name ?? tutor?.email ?? "",
      data,
      pdfBuffer: Buffer.from(pdfBytes),
    });
  }

  // Se guarda también una copia en Google Drive, en Expedientes/, con el
  // nombre nombre_apellido1_apellido2_curso_código (mejor esfuerzo: si
  // Drive falla, no impide que el envío al tutor se complete igualmente).
  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
    if (rootFolderId) {
      const { ensureSubfolder, uploadPdfToDrive } = await import("@/lib/googleDrive");
      const { safeFileName } = await import("@/lib/exportWorkbooks");

      const [nombre, apellido1 = "", ...resto] = data.alumnoNombre.trim().split(/\s+/);
      const apellido2 = resto.join(" ");
      const partes = [nombre, apellido1, apellido2, data.alumnoCurso, expediente.numero].filter(Boolean);
      const filename = `${partes.map(safeFileName).join("_")}.pdf`;

      const schoolFolderId = await ensureSubfolder(rootFolderId, safeFileName(data.schoolName));
      const expedientesFolderId = await ensureSubfolder(schoolFolderId, "Expedientes");
      await uploadPdfToDrive(expedientesFolderId, filename, Buffer.from(pdfBytes));
    }
  } catch {
    // No pasa nada si falla Drive; el tutor ya tiene el PDF por email.
  }

  await notifyUsers([expediente.tutorId], {
    schoolId: expediente.schoolId,
    tipo: "EXPEDIENTE_ENVIADO",
    titulo: "Expediente disciplinario enviado",
    mensaje: `Expediente ${expediente.numero} · ${data.alumnoNombre}`,
    link: "/dashboard/expedientes",
    relatedId: expediente.id,
  });

  await prisma.expediente.update({
    where: { id },
    data: { estado: "ENVIADO", enviadoEn: new Date() },
  });

  await prisma.incidenciaEvento.create({
    data: {
      incidenciaId: expediente.incidenciaId,
      tipo: "EXPEDIENTE_ENVIADO",
      descripcion: `Expediente ${expediente.numero} enviado al tutor`,
      autorId: session.user.id,
    },
  });

  revalidatePath("/dashboard/expedientes");
}

export async function eliminarExpediente(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    throw new Error("No autorizado.");
  }

  await prisma.expediente.delete({ where: { id } });
  revalidatePath("/dashboard/expedientes");
}

// Botón de "enviar" que aparece siempre que una incidencia está cerrada,
// para poder mandar un resumen al email del alumno cuando haga falta
// (independiente del flujo de expediente formal).
export async function enviarResumenIncidencia(incidenciaId: string, email: string) {
  const permiso = await puedeGestionar(incidenciaId);
  if (!permiso.ok || !permiso.incidencia) throw new Error("No autorizado.");
  if (!email?.trim()) throw new Error("Indica un email válido.");

  const incidencia = await prisma.incidencia.findUnique({
    where: { id: incidenciaId },
    include: { alumno: { select: { nombre: true, curso: true } } },
  });
  if (!incidencia) throw new Error("No se ha encontrado la incidencia.");

  const { sendResumenIncidenciaEmail } = await import("@/lib/email");
  await sendResumenIncidenciaEmail({
    to: email.trim(),
    alumnoNombre: incidencia.alumno.nombre,
    curso: incidencia.alumno.curso,
    tipoIncidencia: incidencia.tipoIncidencia,
    fecha: incidencia.fecha,
    descripcion: incidencia.descripcion,
    medidasAplicadas: incidencia.medidasAplicadas,
  });
}
