"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Promocion, TipoTutoriaSeguimiento } from "@prisma/client";

function fecha(formData: FormData, campo: string) {
  const raw = formData.get(campo) as string;
  return raw ? new Date(`${raw}T00:00:00`) : null;
}

function texto(formData: FormData, campo: string) {
  const raw = (formData.get(campo) as string)?.trim();
  return raw || null;
}

// Los campos "desactivables" (DNI, teléfono, dirección...) o se rellenan,
// o se marca "No aplica" — nunca los dos vacíos a la vez. Un campo
// desactivado ("No aplica" marcado) directamente no llega en el
// FormData porque el <input disabled> del navegador no lo envía; así que
// si SÍ ha llegado (está activo) pero viene vacío, es que el usuario se
// lo ha saltado sin querer.
function exigirCampoOMarcarNoAplica(formData: FormData, campo: string, etiqueta: string) {
  if (!formData.has(campo)) return null; // "No aplica" marcado: correcto, se omite.
  const raw = (formData.get(campo) as string)?.trim();
  if (!raw) throw new Error(`${etiqueta}: rellena el campo o marca "No aplica".`);
  return raw;
}

function fechaObligatoriaOMarcarNoAplica(formData: FormData, campo: string, etiqueta: string) {
  if (!formData.has(campo)) return null;
  const raw = (formData.get(campo) as string)?.trim();
  if (!raw) throw new Error(`${etiqueta}: rellena el campo o marca "No aplica".`);
  return new Date(`${raw}T00:00:00`);
}

async function puedeGestionarFicha(fichaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { ok: false as const };

  const ficha = await prisma.practicaAlumno.findUnique({ where: { id: fichaId } });
  if (!ficha) return { ok: false as const };

  const role = session.user.role;
  const esDirectivo =
    role === "SUPERADMIN" || ((role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION") && ficha.schoolId === session.user.schoolId);
  const permitido = esDirectivo || ficha.responsablePracticasId === session.user.id;

  return { ok: permitido, ficha, session, esDirectivo };
}

const CONVENIO_FIELDS = (formData: FormData) => ({
  tipologia: texto(formData, "tipologia"),
  estadoAcuerdo: texto(formData, "estadoAcuerdo"),
  convalida: formData.get("convalida") === "on",
  quienAltaBajaSS: texto(formData, "quienAltaBajaSS"),
  fechaInicio: fecha(formData, "fechaInicio"),
  fechaFin: fecha(formData, "fechaFin"),
  periodo: texto(formData, "periodo"),
  empresaCif: texto(formData, "empresaCif"),
  empresaNombre: texto(formData, "empresaNombre"),
  tutorEmpresaNombre: texto(formData, "tutorEmpresaNombre"),
  tutorEmpresaTelefono: texto(formData, "tutorEmpresaTelefono"),
  tutorEmpresaCorreo: texto(formData, "tutorEmpresaCorreo"),
  observaciones: texto(formData, "observaciones"),
});

// Campos exclusivos del Convenio (no existen en Prorroga, que reutiliza
// CONVENIO_FIELDS): departamento y ciclo/grupo elegidos para los módulos, y
// las horas convalidadas (sustituye al antiguo checkbox "convalida").
const CONVENIO_DEPARTAMENTO_FIELDS = (formData: FormData) => ({
  departamentoId: texto(formData, "departamentoId"),
  cicloGrupo: texto(formData, "cicloGrupo"),
  anyCurso: texto(formData, "anyCurso"),
});

function horasConvalidadas(formData: FormData): number {
  const raw = (formData.get("horasConvalidadas") as string)?.trim();
  const n = Number(raw);
  if (raw === "" || raw === null || raw === undefined || !Number.isFinite(n) || n < 0) {
    throw new Error("Las horas convalidadas son obligatorias (pon 0 si no convalida ninguna).");
  }
  return Math.round(n);
}

// Todos los campos del convenio son obligatorios, salvo "observaciones".
// Se valida aquí, de una vez, para dar un único mensaje de error claro.
function validarConvenioObligatorio(formData: FormData) {
  const obligatorios: [string, string][] = [
    ["tipologia", "La tipología"],
    ["estadoAcuerdo", "El estado del acuerdo"],
    ["quienAltaBajaSS", "Quién da de alta/baja en la Seguridad Social"],
    ["fechaInicio", "La fecha de inicio"],
    ["fechaFin", "La fecha de fin"],
    ["periodo", "El periodo"],
    ["empresaNombre", "El nombre de la empresa"],
    ["empresaCif", "El CIF de la empresa"],
    ["tutorEmpresaNombre", "El nombre del tutor de empresa"],
    ["tutorEmpresaTelefono", "El teléfono del tutor de empresa"],
    ["tutorEmpresaCorreo", "El correo del tutor de empresa"],
    ["departamentoId", "El departamento"],
    ["cicloGrupo", "El ciclo/grupo"],
    ["anyCurso", "El año del ciclo"],
  ];
  for (const [campo, etiqueta] of obligatorios) {
    const valor = (formData.get(campo) as string)?.trim();
    if (!valor) throw new Error(`${etiqueta} es obligatorio.`);
  }
}

// ----- Ficha del alumno -----

export async function crearFichaAlumno(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const alumnoId = (formData.get("alumnoId") as string)?.trim();
  const promocion = (formData.get("promocion") as string) as Promocion;

  if (!alumnoId) throw new Error("Elige el alumno.");
  if (promocion !== "PRIMERA" && promocion !== "SEGUNDA") throw new Error("Elige la promoción.");
  const anyTitulacionRaw = (formData.get("anyTitulacion") as string)?.trim();
  if (!anyTitulacionRaw) throw new Error("El año de titulación es obligatorio.");

  const yaExiste = await prisma.practicaAlumno.findUnique({ where: { alumnoId } });
  if (yaExiste) throw new Error("Este alumno ya tiene una ficha de prácticas creada.");

  // El tutor iMES es siempre el tutor/a académico real del alumno (el
  // mismo que en Tutorías/Mis Alumnos) — nunca quien está creando esta
  // ficha, que puede perfectamente llevar las prácticas de alumnos que no
  // son suyos.
  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId }, select: { profesorId: true } });
  if (!alumno) throw new Error("No se ha encontrado el alumno.");

  const ficha = await prisma.practicaAlumno.create({
    data: {
      schoolId: session.user.schoolId,
      alumnoId,
      promocion,
      cicloFormativo: texto(formData, "cicloFormativo"),
      anyTitulacion: texto(formData, "anyTitulacion"),
      tutorImesId: alumno.profesorId,
      responsablePracticasId: session.user.id,
      dni: exigirCampoOMarcarNoAplica(formData, "dni", "DNI"),
      fechaNacimiento: fechaObligatoriaOMarcarNoAplica(formData, "fechaNacimiento", "Fecha de nacimiento"),
      telefono: exigirCampoOMarcarNoAplica(formData, "telefono", "Teléfono"),
      direccion: exigirCampoOMarcarNoAplica(formData, "direccion", "Dirección"),
      correoAlumno: exigirCampoOMarcarNoAplica(formData, "correoAlumno", "Correo del alumno"),
      cap: exigirCampoOMarcarNoAplica(formData, "cap", "CAP"),
      nuss: exigirCampoOMarcarNoAplica(formData, "nuss", "Nº Seguridad Social (NUSS)"),
    },
  });

  revalidatePath("/dashboard/practicas");
  return { id: ficha.id };
}

export async function actualizarFichaAlumno(formData: FormData) {
  const id = formData.get("id") as string;
  const permiso = await puedeGestionarFicha(id);
  if (!permiso.ok) throw new Error("No autorizado.");

  const promocion = (formData.get("promocion") as string) as Promocion;
  const anyTitulacionUpd = (formData.get("anyTitulacion") as string)?.trim();
  if (!anyTitulacionUpd) throw new Error("El año de titulación es obligatorio.");

  await prisma.practicaAlumno.update({
    where: { id },
    data: {
      promocion: promocion === "PRIMERA" || promocion === "SEGUNDA" ? promocion : undefined,
      cicloFormativo: texto(formData, "cicloFormativo"),
      anyTitulacion: texto(formData, "anyTitulacion"),
      dni: exigirCampoOMarcarNoAplica(formData, "dni", "DNI"),
      fechaNacimiento: fechaObligatoriaOMarcarNoAplica(formData, "fechaNacimiento", "Fecha de nacimiento"),
      telefono: exigirCampoOMarcarNoAplica(formData, "telefono", "Teléfono"),
      direccion: exigirCampoOMarcarNoAplica(formData, "direccion", "Dirección"),
      correoAlumno: exigirCampoOMarcarNoAplica(formData, "correoAlumno", "Correo del alumno"),
      cap: exigirCampoOMarcarNoAplica(formData, "cap", "CAP"),
      nuss: exigirCampoOMarcarNoAplica(formData, "nuss", "Nº Seguridad Social (NUSS)"),
    },
  });

  revalidatePath("/dashboard/practicas");
  revalidatePath(`/dashboard/practicas/${id}`);
}

// Solo equipo directivo puede reasignar quién lleva las prácticas de un
// alumno — por ejemplo, si el responsable original ya no puede seguir
// con ello. El tutor/a académico real no se toca aquí, sigue siendo el
// que tenga en Tutorías.
export async function cambiarResponsablePracticas(fichaId: string, nuevoResponsableId: string) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  const esDirectivo = role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
  if (!session?.user.id || !esDirectivo) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede cambiar el responsable de prácticas.");
  }
  if (!nuevoResponsableId) throw new Error("Elige quién será el nuevo responsable.");

  const ficha = await prisma.practicaAlumno.findUnique({ where: { id: fichaId } });
  if (!ficha) throw new Error("No se ha encontrado la ficha.");

  await prisma.practicaAlumno.update({
    where: { id: fichaId },
    data: { responsablePracticasId: nuevoResponsableId },
  });

  revalidatePath("/dashboard/practicas");
  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function eliminarFichaAlumno(id: string) {
  const permiso = await puedeGestionarFicha(id);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.practicaAlumno.delete({ where: { id } });
  revalidatePath("/dashboard/practicas");
}

// ----- Convenios -----

export async function crearConvenio(formData: FormData) {
  const fichaId = formData.get("practicaAlumnoId") as string;
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  validarConvenioObligatorio(formData);
  const { convalida: _convalida, ...camposBase } = CONVENIO_FIELDS(formData);
  const empresaId = (formData.get("empresaId") as string)?.trim() || null;

  const convenio = await prisma.convenio.create({
    data: {
      practicaAlumnoId: fichaId,
      empresaId,
      ...camposBase,
      ...CONVENIO_DEPARTAMENTO_FIELDS(formData),
      horasConvalidadas: horasConvalidadas(formData),
    },
  });

  // Al vincular una empresa real de la base de datos, se marca como
  // Activa sola — si falla esta parte, el convenio ya se ha guardado
  // igualmente, así que no lo bloqueamos.
  if (empresaId) {
    try {
      await prisma.empresa.update({ where: { id: empresaId }, data: { estado: "ACTIVO" } });
      const usuarioConvenio = await prisma.user.findUnique({ where: { id: permiso.session.user.id }, select: { name: true, email: true } });
      await prisma.empresaHistorial.create({
        data: {
          empresaId,
          accion: "Convenio de prácticas vinculado",
          usuarioId: permiso.session.user.id,
          usuarioNombre: usuarioConvenio?.name ?? usuarioConvenio?.email ?? "—",
        },
      });
    } catch {
      // No pasa nada si esto falla; el convenio ya está guardado.
    }
  }

  revalidatePath(`/dashboard/practicas/${fichaId}`);
  return { id: convenio.id };
}

export async function actualizarConvenio(formData: FormData) {
  const id = formData.get("id") as string;
  const fichaId = formData.get("practicaAlumnoId") as string;
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  const convenio = await prisma.convenio.findUnique({ where: { id } });
  if (!convenio) throw new Error("No se ha encontrado el convenio.");
  if (convenio.cerrado && !permiso.esDirectivo) {
    throw new Error("Este convenio ya está cerrado. Solo Coordinación, Dirección o SuperAdmin puede modificarlo.");
  }

  validarConvenioObligatorio(formData);
  const { convalida: _convalida, ...camposBase } = CONVENIO_FIELDS(formData);
  const empresaId = (formData.get("empresaId") as string)?.trim() || null;

  await prisma.convenio.update({
    where: { id },
    data: { empresaId, ...camposBase, ...CONVENIO_DEPARTAMENTO_FIELDS(formData), horasConvalidadas: horasConvalidadas(formData) },
  });

  if (empresaId) {
    try {
      await prisma.empresa.update({ where: { id: empresaId }, data: { estado: "ACTIVO" } });
      const usuarioConvenio = await prisma.user.findUnique({ where: { id: permiso.session.user.id }, select: { name: true, email: true } });
      await prisma.empresaHistorial.create({
        data: {
          empresaId,
          accion: "Convenio de prácticas vinculado",
          usuarioId: permiso.session.user.id,
          usuarioNombre: usuarioConvenio?.name ?? usuarioConvenio?.email ?? "—",
        },
      });
    } catch {
      // No pasa nada si esto falla; el convenio ya está guardado.
    }
  }

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function eliminarConvenio(id: string, fichaId: string) {
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  const convenio = await prisma.convenio.findUnique({ where: { id } });
  if (convenio?.cerrado && !permiso.esDirectivo) {
    throw new Error("Este convenio ya está cerrado. Solo Coordinación, Dirección o SuperAdmin puede eliminarlo.");
  }

  await prisma.convenio.delete({ where: { id } });
  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

// ----- Cierre del convenio -----

export async function cerrarConvenio(formData: FormData) {
  const id = formData.get("id") as string;
  const fichaId = formData.get("practicaAlumnoId") as string;
  const notaFinal = texto(formData, "notaFinal");
  const fechaCierre = fecha(formData, "fechaCierre") ?? new Date();

  // La nota final tiene que ser un número entero (sin decimales), del 0 al 10.
  if (notaFinal) {
    if (!/^\d+$/.test(notaFinal)) {
      throw new Error("La nota final tiene que ser un número entero, sin decimales.");
    }
    const n = Number(notaFinal);
    if (n < 0 || n > 10) {
      throw new Error("La nota final tiene que estar entre 0 y 10.");
    }
  }

  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok || !permiso.session) throw new Error("No autorizado.");

  const convenio = await prisma.convenio.findUnique({
    where: { id },
    include: { tutoriasSeguimiento: true },
  });
  if (!convenio) throw new Error("No se ha encontrado el convenio.");

  if (convenio.cerrado && !permiso.esDirectivo) {
    throw new Error("Este convenio ya está cerrado. Solo Coordinación, Dirección o SuperAdmin puede modificarlo.");
  }

  // Las 3 tutorías de seguimiento (inicial, media y final) son obligatorias
  // para cerrar un convenio, sin excepción de rol.
  const tipos = new Set(convenio.tutoriasSeguimiento.map((t) => t.tipo));
  const faltan = (["INICIAL", "MEDIA", "FINAL"] as const).filter((t) => !tipos.has(t));
  if (faltan.length > 0) {
    const nombres: Record<string, string> = { INICIAL: "Inicial", MEDIA: "Media", FINAL: "Final" };
    throw new Error(
      `Todavía faltan tutorías de seguimiento por registrar: ${faltan.map((t) => nombres[t]).join(", ")}.`
    );
  }

  await prisma.convenio.update({
    where: { id },
    data: {
      cerrado: true,
      notaFinal,
      fechaCierre,
      cerradoPorId: permiso.session.user.id,
    },
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function reabrirConvenio(id: string, fichaId: string) {
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok || !permiso.esDirectivo) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede reabrir un convenio.");
  }

  await prisma.convenio.update({
    where: { id },
    data: { cerrado: false, fechaCierre: null, cerradoPorId: null },
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

// ----- Tutorías de seguimiento (inicial / media / final) -----

export async function guardarTutoriaSeguimiento(formData: FormData) {
  const convenioId = formData.get("convenioId") as string;
  const fichaId = formData.get("practicaAlumnoId") as string;
  const tipo = formData.get("tipo") as TipoTutoriaSeguimiento;
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok || !permiso.session) throw new Error("No autorizado.");

  if (tipo !== "INICIAL" && tipo !== "MEDIA" && tipo !== "FINAL") {
    throw new Error("Tipo de tutoría no válido.");
  }

  const convenio = await prisma.convenio.findUnique({
    where: { id: convenioId },
    include: { tutoriasSeguimiento: true },
  });
  if (!convenio) throw new Error("No se ha encontrado el convenio.");
  if (convenio.cerrado && !permiso.esDirectivo) {
    throw new Error("Este convenio ya está cerrado. Solo Coordinación, Dirección o SuperAdmin puede modificar sus tutorías.");
  }

  const fechaNueva = fecha(formData, "fecha");
  const resumenNuevo = texto(formData, "resumen");
  const medioContacto = texto(formData, "medioContacto");

  if (!fechaNueva) throw new Error("La fecha es obligatoria.");
  if (!resumenNuevo) throw new Error("El resumen es obligatorio.");
  if (!medioContacto) throw new Error("Elige el medio de contacto.");

  // La inicial tiene que ser la más temprana, la final la más tardía: cada
  // tutoría debe quedar estrictamente después de la anterior.
  const porTipo = new Map(convenio.tutoriasSeguimiento.map((t) => [t.tipo, t]));
  if (tipo === "MEDIA") {
    const inicial = porTipo.get("INICIAL");
    if (inicial?.fecha && fechaNueva <= inicial.fecha) {
      throw new Error("La fecha de la tutoría media tiene que ser posterior a la de la tutoría inicial.");
    }
  }
  if (tipo === "FINAL") {
    const media = porTipo.get("MEDIA");
    if (media?.fecha && fechaNueva <= media.fecha) {
      throw new Error("La fecha de la tutoría final tiene que ser posterior a la de la tutoría media.");
    }
  }
  // Si se edita la inicial o la media después de que ya existan las
  // siguientes, comprobamos también que no se rompa el orden hacia adelante.
  if (tipo === "INICIAL") {
    const media = porTipo.get("MEDIA");
    if (media?.fecha && fechaNueva >= media.fecha) {
      throw new Error("La fecha de la tutoría inicial tiene que ser anterior a la de la tutoría media.");
    }
  }
  if (tipo === "MEDIA") {
    const final = porTipo.get("FINAL");
    if (final?.fecha && fechaNueva >= final.fecha) {
      throw new Error("La fecha de la tutoría media tiene que ser anterior a la de la tutoría final.");
    }
  }

  // La fecha tiene que caer dentro del periodo del propio convenio —
  // comprobación real en el servidor, no solo el min/max del input (que se
  // puede saltar).
  if (convenio.fechaInicio && fechaNueva < convenio.fechaInicio) {
    throw new Error("La fecha no puede ser anterior al inicio del convenio.");
  }
  if (convenio.fechaFin && fechaNueva > convenio.fechaFin) {
    throw new Error("La fecha no puede ser posterior al fin del convenio.");
  }

  await prisma.tutoriaSeguimiento.upsert({
    where: { convenioId_tipo: { convenioId, tipo } },
    create: {
      convenioId,
      tipo,
      fecha: fechaNueva,
      resumen: resumenNuevo,
      medioContacto,
      creadoPorId: permiso.session.user.id,
    },
    update: {
      fecha: fechaNueva,
      resumen: resumenNuevo,
      medioContacto,
    },
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function eliminarTutoriaSeguimiento(id: string, fichaId: string) {
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.tutoriaSeguimiento.delete({ where: { id } });
  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

// ----- Prórrogas (mismos campos que un convenio) -----

export async function crearProrroga(formData: FormData) {
  const convenioId = formData.get("convenioId") as string;
  const fichaId = formData.get("practicaAlumnoId") as string;
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  const convenio = await prisma.convenio.findUnique({ where: { id: convenioId } });
  if (convenio?.cerrado && !permiso.esDirectivo) {
    throw new Error("Este convenio ya está cerrado. Solo Coordinación, Dirección o SuperAdmin puede añadir prórrogas.");
  }

  await prisma.prorroga.create({
    data: {
      convenioId,
      ...CONVENIO_FIELDS(formData),
    },
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function actualizarProrroga(formData: FormData) {
  const id = formData.get("id") as string;
  const fichaId = formData.get("practicaAlumnoId") as string;
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.prorroga.update({
    where: { id },
    data: CONVENIO_FIELDS(formData),
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function eliminarProrroga(id: string, fichaId: string) {
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.prorroga.delete({ where: { id } });
  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

// ----- Módulos profesionales (catálogo por ciclo) y notas del convenio -----

const CICLOS_SEED: Record<string, { codigo: string; nombre: string; horasCentro: number; horasEmpresa: number }[]> = {
  DAM: [
    { codigo: "0373", nombre: "Lenguajes de marcas y sistemas de gestión de información.", horasCentro: 66, horasEmpresa: 33 },
    { codigo: "0483", nombre: "Sistemas informáticos.", horasCentro: 99, horasEmpresa: 66 },
    { codigo: "0484", nombre: "Bases de datos.", horasCentro: 132, horasEmpresa: 66 },
    { codigo: "0485", nombre: "Programación.", horasCentro: 198, horasEmpresa: 66 },
    { codigo: "0486", nombre: "Acceso a datos.", horasCentro: 66, horasEmpresa: 66 },
    { codigo: "0487", nombre: "Entornos de desarrollo.", horasCentro: 66, horasEmpresa: 33 },
    { codigo: "0488", nombre: "Desarrollo de interfaces.", horasCentro: 66, horasEmpresa: 53 },
    { codigo: "0489", nombre: "Programación multimedia y dispositivos móviles.", horasCentro: 66, horasEmpresa: 66 },
    { codigo: "0490", nombre: "Programación de servicios y procesos.", horasCentro: 66, horasEmpresa: 33 },
    { codigo: "0491", nombre: "Sistemas de gestión empresarial.", horasCentro: 66, horasEmpresa: 33 },
  ],
  ASIX: [
    { codigo: "0369", nombre: "Implantación de sistemas operativos.", horasCentro: 132, horasEmpresa: 99 },
    { codigo: "0370", nombre: "Planificación y administración de redes.", horasCentro: 132, horasEmpresa: 53 },
    { codigo: "0371", nombre: "Fundamentos de hardware.", horasCentro: 66, horasEmpresa: 33 },
    { codigo: "0372", nombre: "Gestión de bases de datos.", horasCentro: 132, horasEmpresa: 66 },
    { codigo: "0373", nombre: "Lenguajes de marcas y sistemas de gestión de información.", horasCentro: 66, horasEmpresa: 33 },
    { codigo: "0374", nombre: "Administración de sistemas operativos.", horasCentro: 132, horasEmpresa: 66 },
    { codigo: "0375", nombre: "Servicios de red e internet.", horasCentro: 66, horasEmpresa: 66 },
    { codigo: "0376", nombre: "Implantación de aplicaciones web.", horasCentro: 66, horasEmpresa: 33 },
    { codigo: "0377", nombre: "Administración de sistemas gestores de bases de datos.", horasCentro: 33, horasEmpresa: 33 },
    { codigo: "0378", nombre: "Seguridad y alta disponibilidad.", horasCentro: 66, horasEmpresa: 33 },
  ],
  SIMIX: [
    { codigo: "0221", nombre: "Montaje y mantenimiento de equipos.", horasCentro: 132, horasEmpresa: 99 },
    { codigo: "0222", nombre: "Sistemas operativos monopuesto.", horasCentro: 99, horasEmpresa: 33 },
    { codigo: "0223", nombre: "Aplicaciones ofimáticas.", horasCentro: 99, horasEmpresa: 99 },
    { codigo: "0224", nombre: "Sistemas operativos en red.", horasCentro: 132, horasEmpresa: 66 },
    { codigo: "0225", nombre: "Redes locales.", horasCentro: 132, horasEmpresa: 66 },
    { codigo: "0226", nombre: "Seguridad informática.", horasCentro: 99, horasEmpresa: 33 },
    { codigo: "0227", nombre: "Servicios de red.", horasCentro: 132, horasEmpresa: 66 },
    { codigo: "0228", nombre: "Aplicaciones web.", horasCentro: 66, horasEmpresa: 53 },
  ],
};

// El "ciclo" a efectos de módulos es el nombre del grupo sin el número final
// (p. ej. "DAM1" y "DAM2" comparten el mismo temario, o sea el mismo ciclo "DAM").
export async function cicloDeGrupo(grupo: string): Promise<string> {
  return grupo.replace(/\d+$/, "").trim().toUpperCase();
}

async function esDirectivoSesion() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  const esDirectivo = role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
  return { session, esDirectivo };
}

export async function obtenerDepartamentosDelCentro() {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return [];
  const departamentos = await prisma.departamento.findMany({
    where: { schoolId: session.user.schoolId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return departamentos;
}

// Carga en el centro el catálogo de módulos de DAM/ASIX/SIMIX si todavía no
// existe (no duplica si ya se sembró antes). Solo equipo directivo.
export async function sembrarCatalogoModulos() {
  const { session, esDirectivo } = await esDirectivoSesion();
  if (!session?.user.schoolId || !esDirectivo) throw new Error("No autorizado.");
  const schoolId = session.user.schoolId;

  for (const [ciclo, modulos] of Object.entries(CICLOS_SEED)) {
    for (let i = 0; i < modulos.length; i++) {
      const m = modulos[i];
      await prisma.moduloProfesional.upsert({
        where: { schoolId_cicloFormativo_codigo: { schoolId, cicloFormativo: ciclo, codigo: m.codigo } },
        update: { nombre: m.nombre, horasCentro: m.horasCentro, horasEmpresa: m.horasEmpresa, orden: i },
        create: { schoolId, cicloFormativo: ciclo, codigo: m.codigo, nombre: m.nombre, horasCentro: m.horasCentro, horasEmpresa: m.horasEmpresa, orden: i },
      });
    }
  }
  revalidatePath("/dashboard/practicas");
}

// Devuelve los módulos del ciclo correspondiente a un grupo (p. ej. "DAM1" -> ciclo "DAM").
export async function obtenerModulosPorGrupo(grupo: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return [];
  const ciclo = await cicloDeGrupo(grupo);
  return prisma.moduloProfesional.findMany({
    where: { schoolId: session.user.schoolId, cicloFormativo: ciclo },
    orderBy: { orden: "asc" },
  });
}

// Guarda la selección de módulos de un convenio: sustituye por completo la
// lista anterior por la nueva (borra los que ya no están marcados, añade
// los nuevos, actualiza las horas de los que ya existían).
export async function guardarModulosConvenio(
  convenioId: string,
  seleccion: { moduloProfesionalId: string; horasEmpresa: number }[]
) {
  const convenio = await prisma.convenio.findUnique({ where: { id: convenioId }, select: { practicaAlumnoId: true } });
  if (!convenio) throw new Error("No se ha encontrado el convenio.");
  const permiso = await puedeGestionarFicha(convenio.practicaAlumnoId);
  if (!permiso.ok) throw new Error("No autorizado.");

  const actuales = await prisma.convenioModulo.findMany({ where: { convenioId }, select: { id: true, moduloProfesionalId: true } });
  const idsSeleccionados = new Set(seleccion.map((s) => s.moduloProfesionalId));

  // Elimina los que ya no están marcados
  const aEliminar = actuales.filter((a) => !idsSeleccionados.has(a.moduloProfesionalId)).map((a) => a.id);
  if (aEliminar.length > 0) {
    await prisma.convenioModulo.deleteMany({ where: { id: { in: aEliminar } } });
  }

  // Crea o actualiza cada módulo seleccionado
  for (const s of seleccion) {
    if (!s.moduloProfesionalId || !Number.isFinite(s.horasEmpresa) || s.horasEmpresa < 0) continue;
    await prisma.convenioModulo.upsert({
      where: { convenioId_moduloProfesionalId: { convenioId, moduloProfesionalId: s.moduloProfesionalId } },
      update: { horasEmpresa: s.horasEmpresa },
      create: { convenioId, moduloProfesionalId: s.moduloProfesionalId, horasEmpresa: s.horasEmpresa },
    });
  }

  revalidatePath(`/dashboard/practicas/${convenio.practicaAlumnoId}`);
}

export async function actualizarNotaModulo(convenioModuloId: string, nota: string) {
  const cm = await prisma.convenioModulo.findUnique({
    where: { id: convenioModuloId },
    include: { convenio: { select: { practicaAlumnoId: true } } },
  });
  if (!cm) throw new Error("No se ha encontrado el módulo.");
  const permiso = await puedeGestionarFicha(cm.convenio.practicaAlumnoId);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.convenioModulo.update({
    where: { id: convenioModuloId },
    data: { nota: nota.trim() || null, notaEnviada: false },
  });

  revalidatePath(`/dashboard/practicas/${cm.convenio.practicaAlumnoId}`);
}

// Envía por email, a todos los profesores y coordinadores del departamento
// elegido en el convenio, los módulos evaluados y su nota.
export async function enviarNotasDepartamento(convenioId: string) {
  const convenio = await prisma.convenio.findUnique({
    where: { id: convenioId },
    include: {
      practicaAlumno: { include: { alumno: true } },
      departamento: { include: { profesores: true, coordinadores: true } },
      modulos: { include: { moduloProfesional: true } },
    },
  });
  if (!convenio) throw new Error("No se ha encontrado el convenio.");
  const permiso = await puedeGestionarFicha(convenio.practicaAlumnoId);
  if (!permiso.ok) throw new Error("No autorizado.");
  if (!convenio.departamento) throw new Error("Este convenio no tiene un departamento asignado.");
  if (!convenio.notaFinal || !convenio.notaFinal.trim()) {
    throw new Error("Todavía no hay nota final puesta. Cierra el convenio con una nota antes de enviarla.");
  }
  if (convenio.modulos.length === 0) throw new Error("Este convenio no tiene ningún módulo seleccionado.");

  const destinatarios = new Map<string, { name: string | null; email: string }>();
  for (const p of [...convenio.departamento.profesores, ...convenio.departamento.coordinadores]) {
    destinatarios.set(p.id, { name: p.name, email: p.email });
  }
  if (destinatarios.size === 0) throw new Error("Este departamento todavía no tiene profesores asignados.");

  const { sendNotasConvenioEmail } = await import("@/lib/email");
  await sendNotasConvenioEmail({
    destinatarios: Array.from(destinatarios.values()),
    alumnoNombre: convenio.practicaAlumno.alumno.nombre,
    empresaNombre: convenio.empresaNombre,
    departamentoNombre: convenio.departamento.nombre,
    notaFinal: convenio.notaFinal,
    modulos: convenio.modulos.map((m) => ({ codigo: m.moduloProfesional.codigo, nombre: m.moduloProfesional.nombre })),
  });

  await prisma.convenioModulo.updateMany({
    where: { convenioId },
    data: { notaEnviada: true },
  });

  revalidatePath(`/dashboard/practicas/${convenio.practicaAlumnoId}`);
}

// ----- Administración manual del catálogo de módulos (SuperAdmin) -----

export async function obtenerCatalogoCompleto() {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || session.user.role !== "SUPERADMIN") return [];
  return prisma.moduloProfesional.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: [{ cicloFormativo: "asc" }, { orden: "asc" }],
  });
}

export async function crearModuloProfesional(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || session.user.role !== "SUPERADMIN") throw new Error("No autorizado.");

  const cicloFormativo = (formData.get("cicloFormativo") as string)
    ?.trim()
    .toUpperCase()
    .replace(/\d+$/, ""); // "DAM2" -> "DAM": el mismo ciclo comparte módulos entre sus grupos/años
  const codigo = (formData.get("codigo") as string)?.trim();
  const nombre = (formData.get("nombre") as string)?.trim();
  const horasCentro = Number(formData.get("horasCentro"));
  const horasEmpresa = Number(formData.get("horasEmpresa"));

  if (!cicloFormativo) throw new Error("El ciclo/familia es obligatorio.");
  if (!codigo) throw new Error("El código del módulo es obligatorio.");
  if (!nombre) throw new Error("El nombre del módulo es obligatorio.");
  if (!Number.isFinite(horasCentro) || horasCentro < 0) throw new Error("Las horas en el centro no son válidas.");
  if (!Number.isFinite(horasEmpresa) || horasEmpresa < 0) throw new Error("Las horas en la empresa no son válidas.");

  const yaExiste = await prisma.moduloProfesional.findUnique({
    where: { schoolId_cicloFormativo_codigo: { schoolId: session.user.schoolId, cicloFormativo, codigo } },
  });
  if (yaExiste) throw new Error(`Ja existeix un mòdul amb el codi ${codigo} al cicle ${cicloFormativo}.`);

  const maxOrden = await prisma.moduloProfesional.aggregate({
    where: { schoolId: session.user.schoolId, cicloFormativo },
    _max: { orden: true },
  });

  await prisma.moduloProfesional.create({
    data: {
      schoolId: session.user.schoolId,
      cicloFormativo,
      codigo,
      nombre,
      horasCentro,
      horasEmpresa,
      orden: (maxOrden._max.orden ?? -1) + 1,
    },
  });

  revalidatePath("/dashboard/practicas/modulos-admin");
}

export async function actualizarModuloProfesional(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || session.user.role !== "SUPERADMIN") throw new Error("No autorizado.");

  const id = formData.get("id") as string;
  const nombre = (formData.get("nombre") as string)?.trim();
  const horasCentro = Number(formData.get("horasCentro"));
  const horasEmpresa = Number(formData.get("horasEmpresa"));

  if (!nombre) throw new Error("El nombre del módulo es obligatorio.");
  if (!Number.isFinite(horasCentro) || horasCentro < 0) throw new Error("Las horas en el centro no son válidas.");
  if (!Number.isFinite(horasEmpresa) || horasEmpresa < 0) throw new Error("Las horas en la empresa no son válidas.");

  const modulo = await prisma.moduloProfesional.findUnique({ where: { id } });
  if (!modulo || modulo.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el módulo.");

  await prisma.moduloProfesional.update({
    where: { id },
    data: { nombre, horasCentro, horasEmpresa },
  });

  revalidatePath("/dashboard/practicas/modulos-admin");
}

export async function eliminarModuloProfesional(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || session.user.role !== "SUPERADMIN") throw new Error("No autorizado.");

  const modulo = await prisma.moduloProfesional.findUnique({ where: { id } });
  if (!modulo || modulo.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el módulo.");

  await prisma.moduloProfesional.delete({ where: { id } });
  revalidatePath("/dashboard/practicas/modulos-admin");
}

// Ciclos únicos del centro (grupos reales sin el número final: "SIMIX1" y
// "SIMIX2" -> "SIMIX"), para elegir de una lista en vez de escribirlo a
// mano al crear un módulo nuevo.
export async function obtenerCiclosDelCentro(): Promise<string[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return [];

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: { grupos: true },
  });

  const ciclos = new Set((school?.grupos ?? []).map((g) => g.replace(/\d+$/, "").trim().toUpperCase()).filter(Boolean));
  return Array.from(ciclos).sort();
}
