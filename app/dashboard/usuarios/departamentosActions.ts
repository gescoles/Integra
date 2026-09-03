"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

export async function crearDepartamento(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede crear departamentos.");
  }

  const schoolId = (formData.get("schoolId") as string)?.trim();
  const nombre = (formData.get("nombre") as string)?.trim();

  if (!schoolId) throw new Error("Falta indicar el centro.");
  if (!nombre) throw new Error("Indica el nombre del departamento.");

  await prisma.departamento.create({ data: { schoolId, nombre } });
  revalidatePath("/dashboard/usuarios");
}

export async function eliminarDepartamento(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede eliminar departamentos.");
  }
  await prisma.departamento.delete({ where: { id } });
  revalidatePath("/dashboard/usuarios");
}

// Departamentos de un centro, con quién los coordina ahora mismo (para
// poder mostrar automáticamente el/los coordinador/es al elegir
// departamentos para un profesor).
export async function obtenerDepartamentos(schoolId: string) {
  if (!schoolId) return [];
  const departamentos = await prisma.departamento.findMany({
    where: { schoolId },
    include: { coordinadores: { select: { id: true, name: true, email: true } } },
    orderBy: { nombre: "asc" },
  });

  return departamentos.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    ciclosVinculados: d.ciclosVinculados,
    coordinadores: d.coordinadores.map((c) => ({ id: c.id, nombre: c.name ?? c.email })),
  }));
}

// Ciclos vinculados a un departamento: para que al elegir el departamento
// al crear un convenio, solo salgan los ciclos de ese departamento.
export async function obtenerCiclosDelDepartamento(departamentoId: string) {
  if (!departamentoId) return [];
  const dep = await prisma.departamento.findUnique({
    where: { id: departamentoId },
    select: { ciclosVinculados: true },
  });
  return dep?.ciclosVinculados ?? [];
}

export async function actualizarCiclosDepartamento(departamentoId: string, ciclos: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede vincular ciclos a un departamento.");
  }
  await prisma.departamento.update({ where: { id: departamentoId }, data: { ciclosVinculados: ciclos } });
  revalidatePath("/dashboard/practicas");
  revalidatePath("/dashboard/usuarios");
}

// Solo para SuperAdmin: ciclos de UN centro concreto (elegido por él, no
// el suyo propio, ya que SuperAdmin no pertenece a ningún centro).
export async function obtenerCiclosDeCentro(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { grupos: true } });
  const ciclos = new Set((school?.grupos ?? []).map((g) => g.replace(/\d+$/, "").trim()).filter(Boolean));
  return Array.from(ciclos).sort();
}
