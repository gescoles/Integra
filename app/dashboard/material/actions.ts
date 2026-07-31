"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MaterialCategoria } from "@prisma/client";

export async function createMaterial(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const nombre = (formData.get("nombre") as string)?.trim();
  const curso = (formData.get("curso") as string)?.trim();
  const asignatura = (formData.get("asignatura") as string)?.trim();
  const cantidadRaw = formData.get("cantidad") as string;
  const precioUnidadRaw = formData.get("precioUnidad") as string;
  const proveedor = (formData.get("proveedor") as string)?.trim();
  const enlace = (formData.get("enlace") as string)?.trim();
  const justificacion = (formData.get("justificacion") as string)?.trim();
  const categoria = (formData.get("categoria") as MaterialCategoria) || "OTROS";

  if (!nombre) throw new Error("El nombre del material es obligatorio.");
  if (!curso) throw new Error("El curso es obligatorio.");
  if (!asignatura) throw new Error("La asignatura es obligatoria.");
  if (!cantidadRaw) throw new Error("La cantidad es obligatoria.");
  if (!precioUnidadRaw) throw new Error("El precio por unidad es obligatorio.");
  if (!proveedor) throw new Error("El proveedor es obligatorio.");
  if (!enlace) throw new Error("El enlace donde comprarlo es obligatorio.");
  if (!justificacion) throw new Error("Explica por qué es necesario este material.");

  await prisma.materialRequest.create({
    data: {
      schoolId: session.user.schoolId,
      profesorId: session.user.id,
      nombre,
      curso,
      asignatura,
      cantidad: Number(cantidadRaw) || 1,
      precioUnidad: Number(precioUnidadRaw) || 0,
      proveedor,
      enlace,
      justificacion,
      categoria,
    },
  });

  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}

export async function updateMaterial(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const id = formData.get("id") as string;
  const material = await prisma.materialRequest.findUnique({ where: { id } });
  if (!material || material.profesorId !== session.user.id) {
    throw new Error("No puedes editar un material que no has pedido tú.");
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const curso = (formData.get("curso") as string)?.trim();
  const asignatura = (formData.get("asignatura") as string)?.trim();
  const cantidadRaw = formData.get("cantidad") as string;
  const precioUnidadRaw = formData.get("precioUnidad") as string;
  const proveedor = (formData.get("proveedor") as string)?.trim();
  const enlace = (formData.get("enlace") as string)?.trim();
  const justificacion = (formData.get("justificacion") as string)?.trim();
  const categoria = (formData.get("categoria") as MaterialCategoria) || "OTROS";

  if (!nombre) throw new Error("El nombre del material es obligatorio.");
  if (!curso) throw new Error("El curso es obligatorio.");
  if (!asignatura) throw new Error("La asignatura es obligatoria.");
  if (!cantidadRaw) throw new Error("La cantidad es obligatoria.");
  if (!precioUnidadRaw) throw new Error("El precio por unidad es obligatorio.");
  if (!proveedor) throw new Error("El proveedor es obligatorio.");
  if (!enlace) throw new Error("El enlace donde comprarlo es obligatorio.");
  if (!justificacion) throw new Error("Explica por qué es necesario este material.");

  await prisma.materialRequest.update({
    where: { id },
    data: {
      nombre,
      curso,
      asignatura,
      cantidad: Number(cantidadRaw) || 1,
      precioUnidad: Number(precioUnidadRaw) || 0,
      proveedor,
      enlace,
      justificacion,
      categoria,
    },
  });

  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}

export async function deleteMaterial(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const material = await prisma.materialRequest.findUnique({ where: { id } });
  if (!material || material.profesorId !== session.user.id) {
    throw new Error("No puedes eliminar un material que no es tuyo.");
  }

  await prisma.materialRequest.delete({ where: { id } });
  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}
