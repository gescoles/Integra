"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO";
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
    coordinadores: d.coordinadores.map((c) => ({ id: c.id, nombre: c.name ?? c.email })),
  }));
}
