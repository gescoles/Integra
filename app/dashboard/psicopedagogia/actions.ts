"use server";

import { prisma } from "@/lib/prisma";
import { ConQuienActuacion, MedioActuacion } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

async function requiereSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") throw new Error("Solo el SuperAdmin puede hacer esto.");
  return session;
}

async function esPsicopedagogaDelCentro(schoolId: string, userId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { psicopedagogaId: true } });
  return school?.psicopedagogaId === userId;
}

// ---------- Asignar la psicopedagoga (mismo patrón que el TIC) ----------

export async function asignarPsicopedagogaCentro(schoolId: string, userId: string | null) {
  await requiereSuperAdmin();

  let usuario: { schoolId: string | null; name: string | null; email: string } | null = null;
  if (userId) {
    usuario = await prisma.user.findUnique({ where: { id: userId }, select: { schoolId: true, name: true, email: true } });
    if (!usuario || usuario.schoolId !== schoolId) throw new Error("Ese profesor no pertenece a este centro.");
  }

  await prisma.school.update({ where: { id: schoolId }, data: { psicopedagogaId: userId } });

  // Aviso al profesor asignado — mejor esfuerzo: si falla el correo, la
  // asignación ya se ha hecho igualmente.
  try {
    if (usuario?.email) {
      const { sendPsicopedagogaAsignadaEmail } = await import("@/lib/email");
      await sendPsicopedagogaAsignadaEmail({ to: usuario.email, nombre: usuario.name ?? usuario.email });
    }
  } catch (e) {
    console.error("No se pudo enviar el correo de asignación de psicopedagoga:", e);
  }

  revalidatePath("/dashboard/psicopedagogia");
}

export async function obtenerPsicopedagogaDelCentro(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { psicopedagogaId: true, psicopedagoga: { select: { id: true, name: true, email: true } } },
  });
  return school?.psicopedagoga
    ? { id: school.psicopedagoga.id, nombre: school.psicopedagoga.name ?? school.psicopedagoga.email }
    : null;
}

export async function obtenerProfesoresParaPsicopedagoga(schoolId: string) {
  const profesores = await prisma.user.findMany({
    where: { schoolId, status: "ACTIVO" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  const etiquetaRol = (role: string) =>
    role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION" || role === "DIRECCION" ? "Equipo directivo" : "Profesor/a";
  return profesores.map((p) => ({ id: p.id, nombre: p.name ?? p.email, rol: etiquetaRol(p.role) }));
}

// ---------- Alumnos del centro (para elegir a quién se le hace un PI) ----------

// Todos los alumnos del centro, ya creados por cualquier profesor desde
// Tutorías — la psicopedagoga tiene que poder verlos todos, no solo los
// suyos.
export async function obtenerAlumnosDelCentro() {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return [];

  const [alumnos, departamentos] = await Promise.all([
    prisma.alumno.findMany({
      where: { schoolId: session.user.schoolId },
      include: { profesor: { select: { name: true, email: true } }, alumnoPI: { select: { id: true } }, departamento: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.departamento.findMany({
      where: { schoolId: session.user.schoolId },
      select: { nombre: true, ciclosVinculados: true },
    }),
  ]);

  function departamentoDe(curso: string) {
    return departamentos.find((d) => d.ciclosVinculados.includes(curso))?.nombre ?? null;
  }

  return alumnos.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    curso: a.curso,
    // Si el alumno tiene departamento elegido a mano al crearlo, se usa
    // ese; si no, se sigue infiriendo por el curso como antes.
    departamento: a.departamento?.nombre ?? departamentoDe(a.curso),
    tutorNombre: a.profesor.name ?? a.profesor.email,
    tutorId: a.profesorId,
    fechaNacimiento: a.fechaNacimiento ? a.fechaNacimiento.toISOString() : null,
    tieneExpedientePI: Boolean(a.alumnoPI),
  }));
}

// ---------- Expediente de Psicopedagogia del alumno (AlumnoPI) ----------

export async function crearAlumnoPI(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const alumnoId = (formData.get("alumnoId") as string)?.trim();
  const diagnostico = (formData.get("diagnostico") as string)?.trim();
  const tienePIRaw = (formData.get("tienePI") as string) ?? "";

  if (!alumnoId) throw new Error("Elige un alumno.");
  if (!diagnostico) throw new Error("Indica el diagnóstico o información.");
  if (tienePIRaw !== "SI" && tienePIRaw !== "NO" && tienePIRaw !== "") {
    throw new Error("El valor de \"Tiene PI\" no es válido.");
  }
  // "" (vacío) es una opción válida a propósito — significa "todavía sin
  // especificar", no un error de formulario a medio rellenar.
  const tienePI = tienePIRaw === "" ? null : tienePIRaw === "SI";

  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId } });
  if (!alumno || alumno.schoolId !== session.user.schoolId) throw new Error("Ese alumno no pertenece a este centro.");

  const existente = await prisma.alumnoPI.findUnique({ where: { alumnoId } });
  if (existente) throw new Error("Este alumno ya tiene un expediente de Psicopedagogia abierto.");

  const alumnoPI = await prisma.alumnoPI.create({
    data: {
      schoolId: session.user.schoolId,
      alumnoId,
      psicopedagogaId: session.user.id,
      diagnostico,
      tienePI,
    },
  });

  revalidatePath("/dashboard/psicopedagogia");
  return alumnoPI.id;
}

export async function actualizarAlumnoPI(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const diagnostico = (formData.get("diagnostico") as string)?.trim();
  const tienePIRaw = (formData.get("tienePI") as string) ?? "";
  if (!diagnostico) throw new Error("Indica el diagnóstico o información.");
  if (tienePIRaw !== "SI" && tienePIRaw !== "NO" && tienePIRaw !== "") {
    throw new Error("El valor de \"Tiene PI\" no es válido.");
  }
  const tienePI = tienePIRaw === "" ? null : tienePIRaw === "SI";

  const alumnoPI = await prisma.alumnoPI.findUnique({ where: { id } });
  if (!alumnoPI || alumnoPI.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el expediente.");

  await prisma.alumnoPI.update({
    where: { id },
    data: { diagnostico, tienePI },
  });

  revalidatePath("/dashboard/psicopedagogia");
}

// Lista completa para la pantalla principal de la psicopedagoga: cada
// alumno con expediente abierto, cuántas actuaciones tiene, y el estado
// de su documento del PI si lo hay.
export async function obtenerAlumnosPIDelCentro() {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return [];

  const registros = await prisma.alumnoPI.findMany({
    where: { schoolId: session.user.schoolId },
    include: {
      alumno: { select: { nombre: true, curso: true, profesorId: true, profesor: { select: { name: true, email: true } } } },
      psicopedagoga: { select: { name: true, email: true } },
      actuaciones: { select: { horasDedicadas: true } },
      documento: { select: { estado: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return registros.map((r) => ({
    id: r.id,
    alumnoId: r.alumnoId,
    alumnoNombre: r.alumno.nombre,
    alumnoCurso: r.alumno.curso,
    tutorId: r.alumno.profesorId,
    tutorNombre: r.alumno.profesor.name ?? r.alumno.profesor.email,
    horasDedicadas: r.actuaciones.reduce((suma, a) => suma + a.horasDedicadas, 0),
    diagnostico: r.diagnostico,
    tienePI: r.tienePI,
    totalActuaciones: r.actuaciones.length,
    documentoId: r.documento?.id ?? null,
    estadoDocumento: r.documento?.estado ?? null,
    psicopedagogaNombre: r.psicopedagoga.name ?? r.psicopedagoga.email,
  }));
}

// Detalle de un expediente concreto (para la ficha del alumno).
export async function obtenerAlumnoPIDetalle(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return null;

  const r = await prisma.alumnoPI.findUnique({
    where: { id },
    include: {
      alumno: { select: { nombre: true, curso: true, fechaNacimiento: true, profesorId: true, profesor: { select: { name: true, email: true } } } },
      actuaciones: { orderBy: { fecha: "desc" } },
      documento: true,
      documentos: { orderBy: { createdAt: "desc" }, include: { subidoPor: { select: { name: true, email: true } } } },
    },
  });
  if (!r || r.schoolId !== session.user.schoolId) return null;

  return {
    id: r.id,
    alumnoId: r.alumnoId,
    alumnoNombre: r.alumno.nombre,
    alumnoCurso: r.alumno.curso,
    alumnoFechaNacimiento: r.alumno.fechaNacimiento ? r.alumno.fechaNacimiento.toISOString() : null,
    tutorId: r.alumno.profesorId,
    tutorNombre: r.alumno.profesor.name ?? r.alumno.profesor.email,
    horasDedicadas: r.actuaciones.reduce((suma, a) => suma + a.horasDedicadas, 0),
    diagnostico: r.diagnostico,
    tienePI: r.tienePI,
    actuaciones: r.actuaciones.map((a) => ({
      id: a.id,
      fecha: a.fecha.toISOString(),
      conQuien: a.conQuien,
      medio: a.medio,
      informacionExtra: a.informacionExtra,
      horasDedicadas: a.horasDedicadas,
    })),
    documentos: r.documentos.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      url: d.url,
      tamano: d.tamano,
      subidoPorNombre: d.subidoPor?.name ?? d.subidoPor?.email ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    documentoId: r.documento?.id ?? null,
    documentoEstado: r.documento?.estado ?? null,
  };
}

// ---------- Actuaciones ----------

export async function crearActuacion(alumnoPiId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const fechaRaw = (formData.get("fecha") as string)?.trim();
  const conQuien = formData.get("conQuien") as ConQuienActuacion;
  const medio = formData.get("medio") as MedioActuacion;
  const informacionExtra = (formData.get("informacionExtra") as string)?.trim();
  const horasRaw = (formData.get("horasDedicadas") as string)?.trim();

  if (!fechaRaw) throw new Error("Indica la fecha.");
  if (!conQuien) throw new Error("Indica con quién ha sido la actuación.");
  if (!medio) throw new Error("Indica el medio.");
  if (!informacionExtra) throw new Error("Indica la información extra.");
  if (!horasRaw) throw new Error("Indica las horas dedicadas.");
  const horasDedicadas = Number(horasRaw.replace(",", "."));
  if (!Number.isFinite(horasDedicadas) || horasDedicadas < 0) throw new Error("Las horas dedicadas no son válidas.");

  const alumnoPI = await prisma.alumnoPI.findUnique({ where: { id: alumnoPiId } });
  if (!alumnoPI || alumnoPI.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el expediente.");

  await prisma.pIActuacion.create({
    data: {
      alumnoPiId,
      fecha: new Date(`${fechaRaw}T00:00:00Z`),
      conQuien,
      medio,
      informacionExtra,
      horasDedicadas,
      creadoPorId: session.user.id,
    },
  });

  revalidatePath("/dashboard/psicopedagogia");
}

export async function eliminarActuacion(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const actuacion = await prisma.pIActuacion.findUnique({ where: { id }, include: { alumnoPi: true } });
  if (!actuacion || actuacion.alumnoPi.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la actuación.");

  await prisma.pIActuacion.delete({ where: { id } });
  revalidatePath("/dashboard/psicopedagogia");
}

// ---------- Correo del director/a (configurable por centro) ----------

export async function asignarDirectorPIEmail(schoolId: string, email: string | null) {
  await requiereSuperAdmin();

  const limpio = email?.trim() || null;
  if (limpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
    throw new Error("Ese correo no parece válido.");
  }

  await prisma.school.update({ where: { id: schoolId }, data: { directorPIEmail: limpio } });
  revalidatePath("/dashboard/psicopedagogia");
}

export async function obtenerDirectorPIEmail(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { directorPIEmail: true } });
  return school?.directorPIEmail ?? null;
}

// ---------- Documentos adjuntos a la ficha del alumno ----------

export async function subirDocumentoAlumnoPI(alumnoPiId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const file = formData.get("archivo") as File | null;
  if (!file || file.size === 0) throw new Error("Elige un archivo para subir.");
  if (file.size > 25 * 1024 * 1024) throw new Error("El archivo no puede pesar más de 25 MB.");

  const alumnoPI = await prisma.alumnoPI.findUnique({
    where: { id: alumnoPiId },
    include: { alumno: { select: { nombre: true } }, school: { select: { name: true } } },
  });
  if (!alumnoPI || alumnoPI.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el expediente.");

  const { getSupabaseAdmin, PSICOPEDAGOGIA_BUCKET } = await import("@/lib/supabaseAdmin");
  const supabase = getSupabaseAdmin();
  const path = `${alumnoPI.schoolId}/${alumnoPiId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(PSICOPEDAGOGIA_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: true });
  if (uploadError) throw new Error(`No se pudo subir el archivo: ${uploadError.message}`);

  const { data } = supabase.storage.from(PSICOPEDAGOGIA_BUCKET).getPublicUrl(path);

  await prisma.alumnoPIDocumento.create({
    data: {
      alumnoPiId,
      nombre: file.name,
      url: data.publicUrl,
      tipo: file.type || null,
      tamano: file.size,
      subidoPorId: session.user.id,
    },
  });

  // Además de Supabase (que es lo que sirve la descarga desde la app),
  // se guarda también una copia en la carpeta propia del alumno en
  // Google Drive — mejor esfuerzo: si Drive falla, el archivo ya se ha
  // guardado igualmente y se puede seguir usando desde la app.
  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
    if (rootFolderId) {
      const { ensureSubfolder, uploadGenericFileToDrive } = await import("@/lib/googleDrive");
      const { safeFileName } = await import("@/lib/exportWorkbooks");
      const schoolFolderId = await ensureSubfolder(rootFolderId, safeFileName(alumnoPI.school.name));
      const piFolderId = await ensureSubfolder(schoolFolderId, "PI");
      const alumnoFolderId = await ensureSubfolder(piFolderId, safeFileName(alumnoPI.alumno.nombre));
      await uploadGenericFileToDrive(alumnoFolderId, file.name, Buffer.from(bytes), file.type || "application/octet-stream");
    }
  } catch (e) {
    console.error("No se pudo guardar la copia del documento en Drive:", e);
  }

  revalidatePath("/dashboard/psicopedagogia");
}

export async function eliminarDocumentoAlumnoPI(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const doc = await prisma.alumnoPIDocumento.findUnique({ where: { id }, include: { alumnoPi: true } });
  if (!doc || doc.alumnoPi.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el documento.");

  try {
    const { getSupabaseAdmin, PSICOPEDAGOGIA_BUCKET } = await import("@/lib/supabaseAdmin");
    const supabase = getSupabaseAdmin();
    const path = doc.url.split(`${PSICOPEDAGOGIA_BUCKET}/`)[1];
    if (path) await supabase.storage.from(PSICOPEDAGOGIA_BUCKET).remove([decodeURIComponent(path)]);
  } catch (e) {
    console.error("No se pudo borrar el archivo de Supabase Storage:", e);
  }

  await prisma.alumnoPIDocumento.delete({ where: { id } });
  revalidatePath("/dashboard/psicopedagogia");
}

// Borra el expediente de Psicopedagogia entero de un alumno (incluidas
// sus actuaciones, documentos adjuntos y el PI si lo tenía) — solo la
// psicopedagoga, con confirmación escrita en el cliente ("Eliminar
// [nombre]"), igual que al borrar un alumno.
export async function eliminarAlumnoPI(id: string, confirmacionTexto: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!(await esPsicopedagogaDelCentro(session.user.schoolId, session.user.id))) {
    throw new Error("Solo la persona asignada como Psicopedagoga puede hacer esto.");
  }

  const alumnoPI = await prisma.alumnoPI.findUnique({
    where: { id },
    include: { alumno: { select: { nombre: true } } },
  });
  if (!alumnoPI || alumnoPI.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el expediente.");

  if (confirmacionTexto.trim() !== `Eliminar ${alumnoPI.alumno.nombre}`.trim()) {
    throw new Error("El texto escrito no coincide — no se ha eliminado nada.");
  }

  // Con las cascadas de la base de datos, esto se lleva por delante
  // actuaciones, documentos adjuntos y el PI (con sus firmas) sin dejar
  // nada huérfano.
  await prisma.alumnoPI.delete({ where: { id } });
  revalidatePath("/dashboard/psicopedagogia");
}
