"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CATEGORIAS_CERTIFICACION } from "../../certificaciones/constants";

function esSuperAdmin(role?: string) {
  return role === "SUPERADMIN";
}

// Las 16 categorías de partida, siempre disponibles como punto de
// partida para cualquier departamento nuevo.
export async function obtenerCategoriasDisponibles() {
  const existentes = await prisma.certificacionCatalogo.findMany({
    select: { categoria: true },
    distinct: ["categoria"],
  });
  const todas = new Set<string>([...CATEGORIAS_CERTIFICACION, ...existentes.map((e) => e.categoria)]);
  return Array.from(todas).sort();
}

// Categorías ya asignadas específicamente a ESE departamento — cada
// departamento va acumulando las suyas propias, distintas de las de
// otros departamentos. Se le suman siempre las 16 de partida, para poder
// arrancar de cero con un departamento nuevo sin categorías todavía.
export async function obtenerCategoriasDelDepartamentoAdmin(departamentoId: string) {
  if (!departamentoId) return [...CATEGORIAS_CERTIFICACION].sort();
  const existentes = await prisma.certificacionCatalogo.findMany({
    where: { departamentoId },
    select: { categoria: true },
    distinct: ["categoria"],
  });
  const todas = new Set<string>([...CATEGORIAS_CERTIFICACION, ...existentes.map((e) => e.categoria)]);
  return Array.from(todas).sort();
}

// Todos los centros de la plataforma, para elegir a cuál se le asigna un
// curso (o dejarlo sin centro, para que valga para todos).
export async function obtenerCentrosDisponibles() {
  const centros = await prisma.school.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return centros;
}

// Los departamentos REALES de un centro concreto (los mismos que ya se
// usan en Usuarios/Empresas) — solo tienen sentido una vez elegido el
// centro, porque cada departamento pertenece siempre a uno solo.
export async function obtenerDepartamentosDeCentro(schoolId: string) {
  if (!schoolId) return [];
  const departamentos = await prisma.departamento.findMany({
    where: { schoolId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return departamentos;
}

export async function obtenerCatalogoCompleto() {
  const catalogo = await prisma.certificacionCatalogo.findMany({
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    include: { school: { select: { name: true } }, departamentoRef: { select: { nombre: true } } },
  });
  return catalogo.map((c) => ({
    id: c.id,
    categoria: c.categoria,
    schoolId: c.schoolId,
    schoolName: c.school?.name ?? null,
    departamentoId: c.departamentoId,
    departamentoNombre: c.departamentoRef?.nombre ?? null,
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

function leerCamposCurso(formData: FormData) {
  const str = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? s : null;
  };
  return {
    categoria: (formData.get("categoria") as string)?.trim(),
    schoolId: str(formData.get("schoolId")),
    departamentoId: str(formData.get("departamentoId")),
    nombre: (formData.get("nombre") as string)?.trim(),
    horasDefault: formData.get("horasDefault") ? Number(formData.get("horasDefault")) : null,
    sedeExamenDefault: str(formData.get("sedeExamenDefault")),
    acercaDe: str(formData.get("acercaDe")),
    dirigidoA: str(formData.get("dirigidoA")),
    objetivos: str(formData.get("objetivos")),
    certificacionInfo: str(formData.get("certificacionInfo")),
    contenidos: str(formData.get("contenidos")),
    proximasConvocatorias: str(formData.get("proximasConvocatorias")),
  };
}

export async function crearEntradaCatalogo(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede editar el catálogo de certificaciones.");

  const datos = leerCamposCurso(formData);
  if (!datos.schoolId) throw new Error("El centro es obligatorio.");
  if (!datos.departamentoId) throw new Error("El departamento es obligatorio.");
  if (!datos.categoria) throw new Error("La categoría es obligatoria.");
  if (!datos.nombre) throw new Error("El nombre es obligatorio.");

  await prisma.certificacionCatalogo.create({ data: datos });

  revalidatePath("/dashboard/superadmin/certificaciones-catalogo");
  revalidatePath("/dashboard/certificaciones");
}

export async function actualizarEntradaCatalogo(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede editar el catálogo de certificaciones.");

  const datos = leerCamposCurso(formData);
  if (!datos.schoolId) throw new Error("El centro es obligatorio.");
  if (!datos.departamentoId) throw new Error("El departamento es obligatorio.");
  if (!datos.categoria) throw new Error("La categoría es obligatoria.");
  if (!datos.nombre) throw new Error("El nombre es obligatorio.");

  await prisma.certificacionCatalogo.update({ where: { id }, data: datos });

  revalidatePath("/dashboard/superadmin/certificaciones-catalogo");
  revalidatePath("/dashboard/certificaciones");
}

export async function eliminarEntradaCatalogo(id: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede editar el catálogo de certificaciones.");

  await prisma.certificacionCatalogo.delete({ where: { id } });
  revalidatePath("/dashboard/superadmin/certificaciones-catalogo");
  revalidatePath("/dashboard/certificaciones");
}
