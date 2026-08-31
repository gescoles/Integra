"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function esSuperAdmin(role?: string) {
  return role === "SUPERADMIN";
}

export async function obtenerLoginPasswordHabilitado() {
  const config = await prisma.configuracion.findUnique({ where: { id: "global" } });
  return config?.loginPasswordHabilitado ?? false;
}

export async function actualizarLoginPasswordHabilitado(activo: boolean) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) {
    throw new Error("Solo el SuperAdmin puede cambiar este ajuste.");
  }

  await prisma.configuracion.upsert({
    where: { id: "global" },
    update: { loginPasswordHabilitado: activo },
    create: { id: "global", loginPasswordHabilitado: activo },
  });

  revalidatePath("/dashboard/backup");
}

export async function obtenerHistoriasEntreCentrosHabilitado() {
  const config = await prisma.configuracion.findUnique({ where: { id: "global" } });
  return config?.historiasEntreCentros ?? true;
}

export async function actualizarHistoriasEntreCentrosHabilitado(activo: boolean) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) {
    throw new Error("Solo el SuperAdmin puede cambiar este ajuste.");
  }

  await prisma.configuracion.upsert({
    where: { id: "global" },
    update: { historiasEntreCentros: activo },
    create: { id: "global", historiasEntreCentros: activo },
  });

  revalidatePath("/dashboard/backup");
  revalidatePath("/dashboard");
}
