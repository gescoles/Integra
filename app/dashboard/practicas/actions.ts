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

async function puedeGestionarFicha(fichaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { ok: false as const };

  const ficha = await prisma.practicaAlumno.findUnique({ where: { id: fichaId } });
  if (!ficha) return { ok: false as const };

  const role = session.user.role;
  const esDirectivo =
    role === "SUPERADMIN" || ((role === "COORDINADOR" || role === "ADMIN_CENTRO") && ficha.schoolId === session.user.schoolId);
  const permitido = esDirectivo || ficha.tutorImesId === session.user.id;

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

// ----- Ficha del alumno -----

export async function crearFichaAlumno(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const alumnoId = (formData.get("alumnoId") as string)?.trim();
  const promocion = (formData.get("promocion") as string) as Promocion;

  if (!alumnoId) throw new Error("Elige el alumno.");
  if (promocion !== "PRIMERA" && promocion !== "SEGUNDA") throw new Error("Elige la promoción.");

  const yaExiste = await prisma.practicaAlumno.findUnique({ where: { alumnoId } });
  if (yaExiste) throw new Error("Este alumno ya tiene una ficha de prácticas creada.");

  const ficha = await prisma.practicaAlumno.create({
    data: {
      schoolId: session.user.schoolId,
      alumnoId,
      promocion,
      cicloFormativo: texto(formData, "cicloFormativo"),
      anyTitulacion: texto(formData, "anyTitulacion"),
      tutorImesId: session.user.id,
      dni: texto(formData, "dni"),
      fechaNacimiento: fecha(formData, "fechaNacimiento"),
      telefono: texto(formData, "telefono"),
      direccion: texto(formData, "direccion"),
      correoAlumno: texto(formData, "correoAlumno"),
      cap: texto(formData, "cap"),
      nuss: texto(formData, "nuss"),
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

  await prisma.practicaAlumno.update({
    where: { id },
    data: {
      promocion: promocion === "PRIMERA" || promocion === "SEGUNDA" ? promocion : undefined,
      cicloFormativo: texto(formData, "cicloFormativo"),
      anyTitulacion: texto(formData, "anyTitulacion"),
      dni: texto(formData, "dni"),
      fechaNacimiento: fecha(formData, "fechaNacimiento"),
      telefono: texto(formData, "telefono"),
      direccion: texto(formData, "direccion"),
      correoAlumno: texto(formData, "correoAlumno"),
      cap: texto(formData, "cap"),
      nuss: texto(formData, "nuss"),
    },
  });

  revalidatePath("/dashboard/practicas");
  revalidatePath(`/dashboard/practicas/${id}`);
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

  await prisma.convenio.create({
    data: {
      practicaAlumnoId: fichaId,
      ...CONVENIO_FIELDS(formData),
    },
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
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

  await prisma.convenio.update({
    where: { id },
    data: CONVENIO_FIELDS(formData),
  });

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

  if (!permiso.esDirectivo) {
    // El profesor solo puede cerrar si ya están las 3 tutorías de
    // seguimiento registradas (inicial, media y final).
    const tipos = new Set(convenio.tutoriasSeguimiento.map((t) => t.tipo));
    const faltan = (["INICIAL", "MEDIA", "FINAL"] as const).filter((t) => !tipos.has(t));
    if (faltan.length > 0) {
      const nombres: Record<string, string> = { INICIAL: "Inicial", MEDIA: "Media", FINAL: "Final" };
      throw new Error(
        `Todavía faltan tutorías de seguimiento por registrar: ${faltan.map((t) => nombres[t]).join(", ")}.`
      );
    }
  }

  await prisma.convenio.update({
    where: { id },
    data: {
      cerrado: true,
      notaFinal,
      fechaCierre: new Date(),
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
