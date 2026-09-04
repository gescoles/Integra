"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") throw new Error("No autorizado.");
}

export async function obtenerVentanas() {
  return prisma.proyectoVentana.findMany({
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { grupos: true } } },
  });
}

export async function crearVentana(formData: FormData) {
  await requireSuperAdmin();

  const nombre = (formData.get("nombre") as string)?.trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");

  const existente = await prisma.proyectoVentana.findUnique({ where: { nombre } });
  if (existente) throw new Error("Ya existe una ventana con ese nombre.");

  const ultima = await prisma.proyectoVentana.findFirst({ orderBy: { orden: "desc" } });

  await prisma.proyectoVentana.create({
    data: { nombre, orden: (ultima?.orden ?? -1) + 1 },
  });

  revalidatePath("/dashboard/superadmin/proyectos-ventanas");
  revalidatePath("/dashboard/proyectos");
}

export async function renombrarVentana(id: string, nombre: string) {
  await requireSuperAdmin();

  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) throw new Error("El nombre es obligatorio.");

  const existente = await prisma.proyectoVentana.findUnique({ where: { nombre: nombreLimpio } });
  if (existente && existente.id !== id) throw new Error("Ya existe una ventana con ese nombre.");

  await prisma.proyectoVentana.update({ where: { id }, data: { nombre: nombreLimpio } });

  revalidatePath("/dashboard/superadmin/proyectos-ventanas");
  revalidatePath("/dashboard/proyectos");
}

export async function eliminarVentana(id: string) {
  await requireSuperAdmin();

  const grupos = await prisma.proyectoGrupo.count({ where: { ventanaId: id } });
  if (grupos > 0) {
    throw new Error(
      `No se puede eliminar: todavía hay ${grupos} proyecto(s) creado(s) en esta ventana. Bórralos primero.`
    );
  }

  await prisma.proyectoVentana.delete({ where: { id } });

  revalidatePath("/dashboard/superadmin/proyectos-ventanas");
  revalidatePath("/dashboard/proyectos");
}
