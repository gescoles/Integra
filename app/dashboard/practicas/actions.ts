"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Promocion } from "@prisma/client";

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
  const permitido =
    role === "SUPERADMIN" ||
    ((role === "COORDINADOR" || role === "ADMIN_CENTRO") && ficha.schoolId === session.user.schoolId) ||
    ficha.tutorImesId === session.user.id;

  return { ok: permitido, ficha, session };
}

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
    },
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function actualizarConvenio(formData: FormData) {
  const id = formData.get("id") as string;
  const fichaId = formData.get("practicaAlumnoId") as string;
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.convenio.update({
    where: { id },
    data: {
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
    },
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function eliminarConvenio(id: string, fichaId: string) {
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.convenio.delete({ where: { id } });
  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

// ----- Prórrogas -----

export async function crearProrroga(formData: FormData) {
  const convenioId = formData.get("convenioId") as string;
  const fichaId = formData.get("practicaAlumnoId") as string;
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.prorroga.create({
    data: {
      convenioId,
      fechaInicio: fecha(formData, "fechaInicio"),
      fechaFin: fecha(formData, "fechaFin"),
      observaciones: texto(formData, "observaciones"),
    },
  });

  revalidatePath(`/dashboard/practicas/${fichaId}`);
}

export async function eliminarProrroga(id: string, fichaId: string) {
  const permiso = await puedeGestionarFicha(fichaId);
  if (!permiso.ok) throw new Error("No autorizado.");

  await prisma.prorroga.delete({ where: { id } });
  revalidatePath(`/dashboard/practicas/${fichaId}`);
}
