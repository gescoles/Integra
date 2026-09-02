"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function esPsicopedagogaDelCentro(schoolId: string, userId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { psicopedagogaId: true } });
  return school?.psicopedagogaId === userId;
}

// El correo del director/a lo tiene que configurar el SuperAdmin por
// centro — ya no hay ningún correo por defecto de la plataforma. Si
// todavía no se ha configurado, email será null (se avisa de ello más
// abajo, en solicitarFirmasPI). Si existe un usuario de Docentium con
// ese email, puede entrar a firmar desde dentro de la app; si no
// existe todavía, el correo se le sigue enviando igualmente, pero no
// podrá firmar hasta que tenga cuenta.
async function obtenerEmailDirector(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { directorPIEmail: true } });
  return school?.directorPIEmail || null;
}

async function obtenerUsuarioDirector(schoolId: string) {
  const email = await obtenerEmailDirector(schoolId);
  const usuario = email ? await prisma.user.findFirst({ where: { email }, select: { id: true, name: true, email: true } }) : null;
  return { email, usuario };
}

function leerCamposDocumento(formData: FormData) {
  function str(nombre: string) {
    const v = formData.get(nombre);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  }
  function bool(nombre: string) {
    return formData.get(nombre) === "on" || formData.get(nombre) === "true";
  }
  function json(nombre: string) {
    const v = formData.get(nombre);
    if (typeof v !== "string" || !v.trim()) return null;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }

  return {
    cursoAcademico: str("cursoAcademico") ?? "",
    idioma: (formData.get("idioma") as string) === "ES" ? "ES" : "CA",
    nombreAlumno: str("nombreAlumno") ?? "",
    estudiosEnCurso: str("estudiosEnCurso") ?? "",
    fechaNacimiento: str("fechaNacimiento"),
    lugarNacimiento: str("lugarNacimiento"),
    fechaLlegadaCatalunya: str("fechaLlegadaCatalunya"),
    tutorNombre: str("tutorNombre") ?? "",
    lenguaHabitual: str("lenguaHabitual"),
    planAnteriorSiNo: formData.has("planAnteriorSiNo") ? bool("planAnteriorSiNo") : null,
    medidasRecibidas: str("medidasRecibidas"),
    repeticionCursoSiNo: formData.has("repeticionCursoSiNo") ? bool("repeticionCursoSiNo") : null,
    repeticionCual: str("repeticionCual"),
    centrosAnteriores: str("centrosAnteriores"),
    fechaInicioPI: str("fechaInicioPI"),
    periodoValidez: str("periodoValidez"),
    otrasInfoInteres: str("otrasInfoInteres"),

    motivoInformeNEE: bool("motivoInformeNEE"),
    motivoAvaluacioPsico: bool("motivoAvaluacioPsico"),
    motivoAvaluacioInicial: bool("motivoAvaluacioInicial"),
    motivoOrigenEstranger: bool("motivoOrigenEstranger"),
    motivoCAD: bool("motivoCAD"),
    motivoCADPropuesta: str("motivoCADPropuesta"),
    motivoAltres: bool("motivoAltres"),
    motivoAltresTexto: str("motivoAltresTexto"),
    descripcionNecesidad: str("descripcionNecesidad"),

    profesionales: json("profesionales"),
    medidasSoportes: json("medidasSoportes"),
    horarioPersonalizadoSiNo: formData.has("horarioPersonalizadoSiNo") ? bool("horarioPersonalizadoSiNo") : null,
    adjuntarSiProcede: str("adjuntarSiProcede"),
  };
}

function validarCamposObligatorios(datos: ReturnType<typeof leerCamposDocumento>) {
  if (!datos.cursoAcademico) throw new Error("Falta el curso académico.");
  if (!datos.nombreAlumno) throw new Error("Falta el nombre del alumno.");
  if (!datos.estudiosEnCurso) throw new Error("Faltan los estudios en curso.");
  if (!datos.tutorNombre) throw new Error("Falta el nombre del tutor.");
}

// Crea o actualiza el documento — mientras esté en BORRADOR (o recién
// reabierto), la psicopedagoga puede seguir tocando todo. El botón
// "Guardar" llama a esto sin tocar el estado.
export async function guardarPIDocumento(alumnoPiId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const alumnoPI = await prisma.alumnoPI.findUnique({ where: { id: alumnoPiId }, include: { documento: true } });
  if (!alumnoPI || alumnoPI.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el expediente.");
  if (alumnoPI.documento && alumnoPI.documento.estado !== "BORRADOR") {
    throw new Error("Este documento ya no se puede editar en el estado actual — reábrelo primero.");
  }

  const datos = leerCamposDocumento(formData);
  validarCamposObligatorios(datos);

  if (alumnoPI.documento) {
    await prisma.pIDocumento.update({ where: { id: alumnoPI.documento.id }, data: datos as any });
  } else {
    await prisma.pIDocumento.create({ data: { alumnoPiId, ...datos } as any });
  }

  revalidatePath("/dashboard/psicopedagogia");
}

// Botón "Solicitar firmas": guarda los datos tal como estén, y pide la
// firma al tutor primero. El director recibe también el aviso desde
// ahora (para que sepa que hay algo en camino), aunque le toque firmar
// después de que lo haga el tutor.
export async function solicitarFirmasPI(alumnoPiId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const alumnoPI = await prisma.alumnoPI.findUnique({
    where: { id: alumnoPiId },
    include: { documento: true, alumno: { select: { nombre: true, profesorId: true, profesor: { select: { name: true, email: true } } } } },
  });
  if (!alumnoPI || alumnoPI.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el expediente.");

  const datos = leerCamposDocumento(formData);
  validarCamposObligatorios(datos);

  const { email: emailDirector, usuario: director } = await obtenerUsuarioDirector(session.user.schoolId);
  if (!emailDirector) {
    throw new Error("Todavía no se ha configurado el correo del director/a de este centro — pídele al SuperAdmin que lo ponga en Psicopedagogia antes de solicitar firmas.");
  }

  const documento = alumnoPI.documento
    ? await prisma.pIDocumento.update({
        where: { id: alumnoPI.documento.id },
        data: { ...datos, estado: "PENDIENTE_TUTOR_DIRECTOR", tutorFirmaFecha: null, directorFirmaFecha: null } as any,
      })
    : await prisma.pIDocumento.create({ data: { alumnoPiId, ...datos, estado: "PENDIENTE_TUTOR_DIRECTOR" } as any });

  const tutor = alumnoPI.alumno.profesor;
  const alumnoNombre = alumnoPI.alumno.nombre;

  // Notificación + correo al tutor.
  try {
    await prisma.notificacion.create({
      data: {
        userId: alumnoPI.alumno.profesorId,
        schoolId: session.user.schoolId,
        tipo: "pi_pendiente_firma",
        titulo: "PI pendiente de tu firma",
        mensaje: `El PI de ${alumnoNombre} está listo y necesita tu firma.`,
        link: "/dashboard/psicopedagogia",
        relatedId: documento.id,
      },
    });
  } catch (e) {
    console.error("No se pudo crear la notificación al tutor:", e);
  }
  try {
    if (tutor.email) {
      const { sendPISolicitudFirmaEmail } = await import("@/lib/email");
      await sendPISolicitudFirmaEmail({ to: tutor.email, nombre: tutor.name ?? tutor.email, alumnoNombre, quienFirma: "tutor" });
    }
  } catch (e) {
    console.error("No se pudo enviar el correo al tutor:", e);
  }

  // Notificación + correo al director (si ya tiene cuenta) y, en
  // cualquier caso, el correo a la dirección configurada del centro.
  try {
    if (director) {
      await prisma.notificacion.create({
        data: {
          userId: director.id,
          schoolId: session.user.schoolId,
          tipo: "pi_pendiente_firma",
          titulo: "PI pendiente de tu firma",
          mensaje: `El PI de ${alumnoNombre} necesita tu firma — puedes firmarlo ya, no hace falta esperar a que firme el tutor.`,
          link: "/dashboard/psicopedagogia",
          relatedId: documento.id,
        },
      });
    }
  } catch (e) {
    console.error("No se pudo crear la notificación al director:", e);
  }
  try {
    const { sendPISolicitudFirmaEmail } = await import("@/lib/email");
    await sendPISolicitudFirmaEmail({
      to: emailDirector,
      nombre: director?.name ?? "Dirección",
      alumnoNombre,
      quienFirma: "director",
    });
  } catch (e) {
    console.error("No se pudo enviar el correo al director:", e);
  }

  revalidatePath("/dashboard/psicopedagogia");
}

// El tutor firma su parte.
export async function firmarComoTutorPI(documentoId: string, firmaImagen: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");
  if (!firmaImagen) throw new Error("Falta la firma — dibújala con el ratón o el dedo antes de guardar.");

  const documento = await prisma.pIDocumento.findUnique({
    where: { id: documentoId },
    include: {
      alumnoPi: {
        include: {
          alumno: { select: { nombre: true, profesorId: true } },
          psicopedagoga: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!documento) throw new Error("No se ha encontrado el documento.");
  if (documento.alumnoPi.alumno.profesorId !== session.user.id) throw new Error("Solo el tutor del alumno puede firmar aquí.");
  if (documento.estado !== "PENDIENTE_TUTOR_DIRECTOR") throw new Error("Este documento no está esperando tu firma ahora mismo.");

  // El director puede haber firmado ya (firman en paralelo, sin
  // esperarse) — si es así, esta firma del tutor es la que cierra el
  // paso y el documento avanza a la firma de família/alumno.
  const directorYaFirmo = Boolean(documento.directorFirmaFecha);
  await prisma.pIDocumento.update({
    where: { id: documentoId },
    data: {
      estado: directorYaFirmo ? "PENDIENTE_FAMILIA" : "PENDIENTE_TUTOR_DIRECTOR",
      tutorFirmaUserId: session.user.id,
      tutorFirmaFecha: new Date(),
      tutorFirmaImagen: firmaImagen,
    },
  });

  try {
    const psico = documento.alumnoPi.psicopedagoga;
    if (psico.email) {
      const { sendPIFirmadoAvisoEmail, sendPITodasLasFirmasEmail } = await import("@/lib/email");
      await sendPIFirmadoAvisoEmail({
        to: psico.email,
        nombrePsicopedagoga: psico.name ?? psico.email,
        alumnoNombre: documento.alumnoPi.alumno.nombre,
        quienHaFirmado: "El tutor",
      });
      if (directorYaFirmo) {
        await sendPITodasLasFirmasEmail({ to: psico.email, nombrePsicopedagoga: psico.name ?? psico.email, alumnoNombre: documento.alumnoPi.alumno.nombre });
      }
    }
  } catch (e) {
    console.error("No se pudo avisar a la psicopedagoga de la firma del tutor:", e);
  }

  revalidatePath("/dashboard/psicopedagogia");
}

// El director firma su parte — si es la última firma que faltaba,
// dispara además los avisos de "ya está todo firmado".
export async function firmarComoDirectorPI(documentoId: string, firmaImagen: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");
  if (!firmaImagen) throw new Error("Falta la firma — dibújala con el ratón o el dedo antes de guardar.");

  const documento = await prisma.pIDocumento.findUnique({
    where: { id: documentoId },
    include: {
      alumnoPi: {
        include: {
          alumno: { select: { nombre: true, profesorId: true, profesor: { select: { name: true, email: true } } } },
          psicopedagoga: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!documento) throw new Error("No se ha encontrado el documento.");

  const { usuario: director } = await obtenerUsuarioDirector(documento.alumnoPi.schoolId);
  if (!director || director.id !== session.user.id) throw new Error("Solo el director del centro puede firmar aquí.");
  if (documento.estado !== "PENDIENTE_TUTOR_DIRECTOR") throw new Error("Este documento no está esperando tu firma ahora mismo.");

  // El tutor puede haber firmado ya (firman en paralelo, sin esperarse)
  // — si es así, esta firma del director es la que cierra el paso.
  const tutorYaFirmo = Boolean(documento.tutorFirmaFecha);
  await prisma.pIDocumento.update({
    where: { id: documentoId },
    data: {
      estado: tutorYaFirmo ? "PENDIENTE_FAMILIA" : "PENDIENTE_TUTOR_DIRECTOR",
      directorFirmaUserId: session.user.id,
      directorFirmaFecha: new Date(),
      directorFirmaImagen: firmaImagen,
    },
  });

  const psico = documento.alumnoPi.psicopedagoga;
  const tutor = documento.alumnoPi.alumno.profesor;
  const alumnoNombre = documento.alumnoPi.alumno.nombre;

  try {
    if (psico.email) {
      const { sendPIFirmadoAvisoEmail, sendPITodasLasFirmasEmail } = await import("@/lib/email");
      await sendPIFirmadoAvisoEmail({
        to: psico.email,
        nombrePsicopedagoga: psico.name ?? psico.email,
        alumnoNombre,
        quienHaFirmado: "El director",
      });
      if (tutorYaFirmo) {
        await sendPITodasLasFirmasEmail({ to: psico.email, nombrePsicopedagoga: psico.name ?? psico.email, alumnoNombre });
      }
    }
  } catch (e) {
    console.error("No se pudo avisar a la psicopedagoga de la firma del director:", e);
  }

  // Solo cuando las DOS firmas internas (tutor + director) ya están
  // hechas — no importa en qué orden hayan llegado — le toca al tutor
  // quedar en persona con la família y el alumno.
  if (tutorYaFirmo) {
    try {
      if (tutor.email) {
        const { sendPIContactarFamiliaEmail } = await import("@/lib/email");
        await sendPIContactarFamiliaEmail({ to: tutor.email, nombreTutor: tutor.name ?? tutor.email, alumnoNombre });
      }
      await prisma.notificacion.create({
        data: {
          userId: documento.alumnoPi.alumno.profesorId,
          schoolId: documento.alumnoPi.schoolId,
          tipo: "pi_contactar_familia",
          titulo: "PI: ya puedes contactar con la familia",
          mensaje: `El PI de ${alumnoNombre} ya tiene las firmas internas — ya puedes quedar con la família y el alumno para que lo firmen.`,
          link: "/dashboard/psicopedagogia",
          relatedId: documento.id,
        },
      });
    } catch (e) {
      console.error("No se pudo avisar al tutor de que ya puede contactar con la familia:", e);
    }
  }

  revalidatePath("/dashboard/psicopedagogia");
}

// El tutor marca que la família ya ha firmado (en persona, fuera de la
// app) — y lo mismo para el alumno. Cuando las dos están marcadas,
// puede cerrar el PI internamente.
export async function marcarFirmaFamiliaPI(documentoId: string, firmaImagen: string | null, rechazada: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");
  if (!rechazada && !firmaImagen) throw new Error("Falta la firma — dibújala, o marca que no quiere firmar.");

  const documento = await prisma.pIDocumento.findUnique({
    where: { id: documentoId },
    include: { alumnoPi: { include: { alumno: { select: { profesorId: true } } } } },
  });
  if (!documento) throw new Error("No se ha encontrado el documento.");
  if (documento.alumnoPi.alumno.profesorId !== session.user.id) throw new Error("Solo el tutor del alumno puede marcar esto.");
  if (documento.estado !== "PENDIENTE_FAMILIA") throw new Error("Este documento no está en el paso de firma de família y alumno.");

  await prisma.pIDocumento.update({
    where: { id: documentoId },
    data: {
      firmaFamiliaFecha: new Date(),
      firmaFamiliaImagen: rechazada ? null : firmaImagen,
      firmaFamiliaRechazada: rechazada,
    },
  });
  revalidatePath("/dashboard/psicopedagogia");
}

export async function marcarFirmaAlumnoPI(documentoId: string, firmaImagen: string | null, rechazada: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");
  if (!rechazada && !firmaImagen) throw new Error("Falta la firma — dibújala, o marca que no quiere firmar.");

  const documento = await prisma.pIDocumento.findUnique({
    where: { id: documentoId },
    include: { alumnoPi: { include: { alumno: { select: { profesorId: true } } } } },
  });
  if (!documento) throw new Error("No se ha encontrado el documento.");
  if (documento.alumnoPi.alumno.profesorId !== session.user.id) throw new Error("Solo el tutor del alumno puede marcar esto.");
  if (documento.estado !== "PENDIENTE_FAMILIA") throw new Error("Este documento no está en el paso de firma de família y alumno.");

  await prisma.pIDocumento.update({
    where: { id: documentoId },
    data: {
      firmaAlumnoFecha: new Date(),
      firmaAlumnoImagen: rechazada ? null : firmaImagen,
      firmaAlumnoRechazada: rechazada,
    },
  });
  revalidatePath("/dashboard/psicopedagogia");
}

// Con las cuatro firmas hechas (tutor, director, família, alumno), el
// tutor cierra el PI internamente — y solo entonces aparece el botón
// para enviarlo por correo a la família y al alumno.
export async function cerrarPIInternoPI(documentoId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const documento = await prisma.pIDocumento.findUnique({
    where: { id: documentoId },
    include: {
      alumnoPi: {
        include: { alumno: { select: { nombre: true, profesorId: true } }, psicopedagoga: { select: { name: true, email: true } } },
      },
    },
  });
  if (!documento) throw new Error("No se ha encontrado el documento.");
  if (documento.alumnoPi.alumno.profesorId !== session.user.id) throw new Error("Solo el tutor del alumno puede cerrar esto.");
  if (documento.estado !== "PENDIENTE_FAMILIA") throw new Error("Este documento no está en el paso de firma de família y alumno.");
  if (!documento.firmaFamiliaFecha || !documento.firmaAlumnoFecha) {
    throw new Error("Faltan marcar la firma de la família y/o la del alumno antes de cerrar.");
  }

  await prisma.pIDocumento.update({ where: { id: documentoId }, data: { estado: "LISTO_PARA_ENVIAR" } });

  try {
    const psico = documento.alumnoPi.psicopedagoga;
    if (psico.email) {
      const { sendPITodasLasFirmasEmail } = await import("@/lib/email");
      await sendPITodasLasFirmasEmail({ to: psico.email, nombrePsicopedagoga: psico.name ?? psico.email, alumnoNombre: documento.alumnoPi.alumno.nombre });
    }
  } catch (e) {
    console.error("No se pudo avisar a la psicopedagoga de que el PI está cerrado internamente:", e);
  }

  revalidatePath("/dashboard/psicopedagogia");
}

// El tutor envía el PI a la familia y al alumno — con esto se cierra.
export async function enviarPIAFamilia(documentoId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const emailFamilia = (formData.get("emailFamilia") as string)?.trim();
  const emailAlumno = (formData.get("emailAlumno") as string)?.trim();
  if (!emailFamilia) throw new Error("Falta el correo de la familia.");

  const documento = await prisma.pIDocumento.findUnique({
    where: { id: documentoId },
    include: {
      alumnoPi: {
        include: {
          alumno: { select: { nombre: true, profesorId: true } },
          psicopedagoga: { select: { name: true, email: true } },
          school: { select: { name: true } },
        },
      },
    },
  });
  if (!documento) throw new Error("No se ha encontrado el documento.");
  if (documento.alumnoPi.alumno.profesorId !== session.user.id) throw new Error("Solo el tutor del alumno puede enviar esto.");
  if (documento.estado !== "LISTO_PARA_ENVIAR") throw new Error("Este documento todavía no tiene las dos firmas hechas.");

  await prisma.pIDocumento.update({
    where: { id: documentoId },
    data: { estado: "CERRADO", emailFamilia, emailAlumno: emailAlumno || null, enviadoFecha: new Date() },
  });

  const alumnoNombre = documento.alumnoPi.alumno.nombre;

  // Generamos el PDF una vez cerrado — se adjunta en los correos y se
  // guarda también en Drive, en su propia carpeta separada, con el
  // nombre nombre_apellidos_fecha. Mejor esfuerzo: si Drive falla, no
  // impide que el envío a la familia se complete igualmente.
  let pdfBytes: Uint8Array | null = null;
  try {
    const { getPIDocumentoData, buildPIPdf } = await import("@/lib/piDocs");
    const datosCompletos = await getPIDocumentoData(documentoId);
    if (datosCompletos) pdfBytes = await buildPIPdf(datosCompletos);
  } catch (e) {
    console.error("No se pudo generar el PDF del PI:", e);
  }

  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
    if (pdfBytes && rootFolderId) {
      const { ensureSubfolder, uploadPdfToDrive } = await import("@/lib/googleDrive");
      const { safeFileName } = await import("@/lib/exportWorkbooks");
      const fecha = new Date().toISOString().slice(0, 10);
      const filename = `PI_${safeFileName(alumnoNombre)}_${fecha}.pdf`;
      // La misma carpeta del alumno donde ya se guardan sus documentos
      // adjuntos — así queda todo junto, PI incluido.
      const schoolFolderId = await ensureSubfolder(rootFolderId, safeFileName(documento.alumnoPi.school.name));
      const piFolderId = await ensureSubfolder(schoolFolderId, "PI");
      const alumnoFolderId = await ensureSubfolder(piFolderId, safeFileName(alumnoNombre));
      await uploadPdfToDrive(alumnoFolderId, filename, Buffer.from(pdfBytes));
    }
  } catch (e) {
    console.error("No se pudo guardar el PDF del PI en Drive:", e);
  }

  try {
    const { sendPIDocumentoFamiliaEmail } = await import("@/lib/email");
    const pdfBuffer = pdfBytes ? Buffer.from(pdfBytes) : undefined;
    await sendPIDocumentoFamiliaEmail({ to: emailFamilia, alumnoNombre, destinatario: "familia", pdfBuffer });
    if (emailAlumno) await sendPIDocumentoFamiliaEmail({ to: emailAlumno, alumnoNombre, destinatario: "alumno", pdfBuffer });
  } catch (e) {
    console.error("No se pudo enviar el PI a la familia/alumno:", e);
  }

  try {
    const psico = documento.alumnoPi.psicopedagoga;
    if (psico.email) {
      const { sendPICerradoEmail } = await import("@/lib/email");
      await sendPICerradoEmail({ to: psico.email, nombrePsicopedagoga: psico.name ?? psico.email, alumnoNombre });
    }
  } catch (e) {
    console.error("No se pudo avisar a la psicopedagoga del cierre del PI:", e);
  }

  revalidatePath("/dashboard/psicopedagogia");
}

// La psicopedagoga puede reabrir un PI cerrado para editarlo — vuelve
// al estado inicial (BORRADOR), y hay que rehacer todo el circuito de
// firmas desde cero.
export async function reabrirPIDocumento(documentoId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const documento = await prisma.pIDocumento.findUnique({ where: { id: documentoId }, include: { alumnoPi: true } });
  if (!documento || documento.alumnoPi.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el documento.");

  await prisma.pIDocumento.update({
    where: { id: documentoId },
    data: {
      estado: "BORRADOR",
      tutorFirmaUserId: null,
      tutorFirmaFecha: null,
      directorFirmaUserId: null,
      directorFirmaFecha: null,
      emailFamilia: null,
      emailAlumno: null,
      enviadoFecha: null,
    },
  });

  revalidatePath("/dashboard/psicopedagogia");
}

// Borra el documento del PI por completo — solo la psicopedagoga, en
// cualquier estado (por si se equivocó al crearlo). Esto no toca el
// expediente del alumno (AlumnoPI) ni sus actuaciones, solo el
// documento del PI en sí.
export async function eliminarPIDocumento(documentoId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado: no hay sesión activa.");
  if (!session.user.schoolId) throw new Error("No autorizado: tu cuenta no tiene un centro asignado.");

  const documento = await prisma.pIDocumento.findUnique({ where: { id: documentoId }, include: { alumnoPi: true } });
  if (!documento) throw new Error("No se ha encontrado ese documento — puede que ya se haya eliminado.");
  if (documento.alumnoPi.schoolId !== session.user.schoolId) {
    throw new Error("Ese documento no pertenece a tu centro.");
  }
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga de este centro puede eliminar el PI.");
  }

  await prisma.pIDocumento.delete({ where: { id: documentoId } });
  revalidatePath("/dashboard/psicopedagogia");
}

export async function obtenerPIDocumento(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return null;

  const documento = await prisma.pIDocumento.findUnique({
    where: { id },
    include: {
      alumnoPi: {
        include: { alumno: { select: { nombre: true, profesorId: true } }, school: { select: { id: true } } },
      },
    },
  });
  if (!documento) return null;

  return documento;
}
