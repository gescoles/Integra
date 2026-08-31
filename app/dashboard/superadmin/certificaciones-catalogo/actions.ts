"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CATEGORIAS_CERTIFICACION } from "../../certificaciones/constants";

function esSuperAdmin(role?: string) {
  return role === "SUPERADMIN";
}

// Las 16 categorías de partida + cualquier otra que ya se haya usado en el
// catálogo (así, si escribes una nueva al crear un curso, a partir de
// entonces también sale en el desplegable para los siguientes).
export async function obtenerCategoriasDisponibles() {
  const existentes = await prisma.certificacionCatalogo.findMany({
    select: { categoria: true },
    distinct: ["categoria"],
  });
  const todas = new Set<string>([...CATEGORIAS_CERTIFICACION, ...existentes.map((e) => e.categoria)]);
  return Array.from(todas).sort();
}

export async function obtenerCatalogoCompleto() {
  const catalogo = await prisma.certificacionCatalogo.findMany({
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });
  return catalogo.map((c) => ({
    id: c.id,
    categoria: c.categoria,
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
