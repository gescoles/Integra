"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Las 16 categorías son fijas, iguales para cualquier centro — viven en
// ./constants.ts (archivo aparte, sin "use server") porque un archivo de
// Server Actions solo puede exportar funciones async, nunca constantes.

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

export async function obtenerCatalogoPorCategoria(categoria: string) {
  if (!categoria) return [];
  const catalogo = await prisma.certificacionCatalogo.findMany({
    where: { categoria },
    orderBy: { nombre: "asc" },
  });
  return catalogo.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    horasDefault: c.horasDefault,
    sedeExamenDefault: c.sedeExamenDefault,
    acercaDe: c.acercaDe,
    dirigidoA: c.dirigidoA,
    objetivos: c.objetivos,
    certificacionInfo: c.certificacionInfo,
    contenidos: c.contenidos,
    proximasConvocatorias: c.proximasConvocatorias,
  }));
}

// El catálogo entero, para la pestaña "Catálogo de cursos" que puede
// consultar cualquier rol (información del curso, sin poder tocar nada).
export async function obtenerCatalogoCompletoPublico() {
  const catalogo = await prisma.certificacionCatalogo.findMany({
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });
  return catalogo.map((c) => ({
    id: c.id,
    categoria: c.categoria,
    nombre: c.nombre,
    horasDefault: c.horasDefault,
    acercaDe: c.acercaDe,
    dirigidoA: c.dirigidoA,
    objetivos: c.objetivos,
    certificacionInfo: c.certificacionInfo,
    contenidos: c.contenidos,
    proximasConvocatorias: c.proximasConvocatorias,
  }));
}

function leerCamposCertificacion(formData: FormData) {
  const str = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? s : null;
  };
  const fecha = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? new Date(s) : null;
  };
  const num = (v: FormDataEntryValue | null) => (v && String(v).trim() ? Number(v) : null);

  return {
    categoria: (formData.get("categoria") as string)?.trim(),
    nombreCertificacion: (formData.get("nombreCertificacion") as string)?.trim(),
    cursoAcademico: (formData.get("cursoAcademico") as string)?.trim(),
    cicloFormativo: (formData.get("cicloFormativo") as string)?.trim(),
    horas: num(formData.get("horas")),
    fechaInicioPreparacion: fecha(formData.get("fechaInicioPreparacion")) as Date,
    fechaFinPreparacion: fecha(formData.get("fechaFinPreparacion")),
    fechaExamen: fecha(formData.get("fechaExamen")),
    estado: (formData.get("estado") as string) || "PROGRAMADA",
    codigoPue: str(formData.get("codigoPue")),
    entidadCertificadora: str(formData.get("entidadCertificadora")),
    nivelMCE: str(formData.get("nivelMCE")),
    duracionExamen: str(formData.get("duracionExamen")),
    modalidad: str(formData.get("modalidad")),
    sedeExamen: str(formData.get("sedeExamen")),
    notas: str(formData.get("notas")),
  };
}

// Todo es obligatorio menos la fecha del examen y su duración — se
// valida aquí también por si alguien se salta el formulario y llama
// directamente a la acción.
function validarCamposObligatorios(datos: ReturnType<typeof leerCamposCertificacion>) {
  if (!datos.categoria) throw new Error("Elige una categoría.");
  if (!datos.cursoAcademico) throw new Error("El curso es obligatorio.");
  if (!datos.cicloFormativo) throw new Error("Elige el grupo/ciclo formativo.");
  if (!datos.fechaInicioPreparacion) throw new Error("La fecha de inicio de la preparación es obligatoria.");
  if (!datos.fechaFinPreparacion) throw new Error("La fecha de fin de la preparación es obligatoria.");
  if (!datos.nombreCertificacion) throw new Error("Elige el nombre de la certificación.");
  if (datos.horas == null) throw new Error("Las horas son obligatorias.");
  if (!datos.modalidad) throw new Error("La modalidad es obligatoria.");
}

export async function crearCertificacion(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const datos = leerCamposCertificacion(formData);
  validarCamposObligatorios(datos);

  const cert = await prisma.certificacion.create({
    data: { ...datos, schoolId: session.user.schoolId, creadoPorId: session.user.id } as any,
  });

  revalidatePath("/dashboard/certificaciones");
  return cert.id;
}

// Editar una certificación ya programada: puede hacerlo quien la creó, o
// Coordinación/Administración/SuperAdmin (que ven todas).
export async function actualizarCertificacion(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const cert = await prisma.certificacion.findUnique({ where: { id } });
  if (!cert || cert.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la certificación.");
  if (cert.creadoPorId !== session.user.id && !esDirectivo(session.user.role)) {
    throw new Error("Solo quien la creó, o Coordinación/Administración, puede editarla.");
  }

  const datos = leerCamposCertificacion(formData);
  validarCamposObligatorios(datos);

  await prisma.certificacion.update({ where: { id }, data: datos as any });

  revalidatePath("/dashboard/certificaciones");
}

// Listado con permisos: un profesor solo ve las que él ha creado;
// Coordinación/Administración/SuperAdmin ven todas las del centro, con
// filtros por categoría, curso, ciclo y profesor.
export async function obtenerCertificaciones(filtros?: { categoria?: string; cursoAcademico?: string; cicloFormativo?: string; creadoPorId?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) return [];

  const puedeVerTodas = esDirectivo(session.user.role);

  const certificaciones = await prisma.certificacion.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(puedeVerTodas ? {} : { creadoPorId: session.user.id }),
      ...(filtros?.categoria ? { categoria: filtros.categoria } : {}),
      ...(filtros?.cursoAcademico ? { cursoAcademico: filtros.cursoAcademico } : {}),
      ...(filtros?.cicloFormativo ? { cicloFormativo: filtros.cicloFormativo } : {}),
      ...(filtros?.creadoPorId ? { creadoPorId: filtros.creadoPorId } : {}),
    },
    include: { creadoPor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return certificaciones.map((c) => ({
    id: c.id,
    categoria: c.categoria,
    nombreCertificacion: c.nombreCertificacion,
    cursoAcademico: c.cursoAcademico,
    cicloFormativo: c.cicloFormativo,
    horas: c.horas,
    fechaInicioPreparacion: c.fechaInicioPreparacion.toISOString(),
    fechaFinPreparacion: c.fechaFinPreparacion ? c.fechaFinPreparacion.toISOString() : null,
    fechaExamen: c.fechaExamen ? c.fechaExamen.toISOString() : null,
    estado: c.estado,
    codigoPue: c.codigoPue,
    entidadCertificadora: c.entidadCertificadora,
    nivelMCE: c.nivelMCE,
    duracionExamen: c.duracionExamen,
    modalidad: c.modalidad,
    sedeExamen: c.sedeExamen,
    notas: c.notas,
    creadoPorNombre: c.creadoPor ? (c.creadoPor.name ?? c.creadoPor.email) : null,
    creadoPorId: c.creadoPorId,
  }));
}

// Para el filtro "por profesor" de Coordinación: cuántas certificaciones
// ha creado cada profesor del centro.
export async function obtenerProfesoresConCertificaciones() {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || !esDirectivo(session.user.role)) return [];

  const certificaciones = await prisma.certificacion.findMany({
    where: { schoolId: session.user.schoolId },
    select: { creadoPorId: true, creadoPor: { select: { id: true, name: true, email: true } } },
  });

  const conteo = new Map<string, { id: string; nombre: string; cantidad: number }>();
  for (const c of certificaciones) {
    if (!c.creadoPorId || !c.creadoPor) continue;
    const existente = conteo.get(c.creadoPorId);
    if (existente) existente.cantidad += 1;
    else conteo.set(c.creadoPorId, { id: c.creadoPorId, nombre: c.creadoPor.name ?? c.creadoPor.email, cantidad: 1 });
  }

  return Array.from(conteo.values()).sort((a, b) => b.cantidad - a.cantidad);
}

export async function obtenerCertificacion(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return null;

  const c = await prisma.certificacion.findUnique({ where: { id } });
  if (!c || c.schoolId !== session.user.schoolId) return null;

  return {
    id: c.id,
    categoria: c.categoria,
    nombreCertificacion: c.nombreCertificacion,
    cursoAcademico: c.cursoAcademico,
    cicloFormativo: c.cicloFormativo,
    horas: c.horas,
    fechaInicioPreparacion: c.fechaInicioPreparacion.toISOString().slice(0, 10),
    fechaFinPreparacion: c.fechaFinPreparacion ? c.fechaFinPreparacion.toISOString().slice(0, 10) : "",
    fechaExamen: c.fechaExamen ? c.fechaExamen.toISOString().slice(0, 10) : "",
    estado: c.estado,
    codigoPue: c.codigoPue,
    entidadCertificadora: c.entidadCertificadora,
    nivelMCE: c.nivelMCE,
    duracionExamen: c.duracionExamen,
    modalidad: c.modalidad,
    sedeExamen: c.sedeExamen,
    notas: c.notas,
    creadoPorId: c.creadoPorId,
  };
}
