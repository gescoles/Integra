"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Locale } from "@prisma/client";

export async function updateMyLocale(locale: Locale) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");
  if (!["CA", "ES", "EN"].includes(locale)) throw new Error("Idioma no válido.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { locale },
  });

  revalidatePath("/dashboard");
}
