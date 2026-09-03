"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AvisoCategoria } from "@prisma/client";

export async function createAviso(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");
  if (!["COORDINADOR", "ADMIN_CENTRO", "SUPERADMIN", "ADMINISTRACION", "DIRECCION"].includes(session.user.role)) {
    throw new Error("No tienes permiso para publicar avisos.");
  }

  const titulo = (formData.get("titulo") as string)?.trim();
  const cuerpo = (formData.get("cuerpo") as string)?.trim();
  const categoria = (formData.get("categoria") as AvisoCategoria) || "GENERAL";

  if (!titulo) throw new Error("El título es obligatorio.");
  if (!cuerpo) throw new Error("El contenido del aviso es obligatorio.");

  await prisma.aviso.create({
    data: {
      schoolId: session.user.schoolId,
      autorId: session.user.id,
      titulo,
      cuerpo,
      categoria,
    },
  });

  revalidatePath("/dashboard");
}

export async function deleteAviso(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const aviso = await prisma.aviso.findUnique({ where: { id } });
  if (!aviso || aviso.autorId !== session.user.id) {
    throw new Error("No puedes eliminar un aviso que no publicaste tú.");
  }

  await prisma.aviso.delete({ where: { id } });
  revalidatePath("/dashboard");
}
