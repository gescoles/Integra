"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") throw new Error("No autorizado.");
}

export async function crearEntrada(formData: FormData) {
  await requireSuperAdmin();

  const pregunta = (formData.get("pregunta") as string)?.trim();
  const respuesta = (formData.get("respuesta") as string)?.trim();
  const palabrasClaveRaw = (formData.get("palabrasClave") as string)?.trim();

  if (!pregunta) throw new Error("La pregunta es obligatoria.");
  if (!respuesta) throw new Error("La respuesta es obligatoria.");

  const palabrasClave = palabrasClaveRaw
    ? palabrasClaveRaw.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  await prisma.chatbotEntry.create({
    data: { pregunta, respuesta, palabrasClave },
  });

  revalidatePath("/dashboard/chatbot-admin");
}

export async function actualizarEntrada(formData: FormData) {
  await requireSuperAdmin();

  const id = formData.get("id") as string;
  const pregunta = (formData.get("pregunta") as string)?.trim();
  const respuesta = (formData.get("respuesta") as string)?.trim();
  const palabrasClaveRaw = (formData.get("palabrasClave") as string)?.trim();

  if (!id) throw new Error("Falta el identificador.");
  if (!pregunta) throw new Error("La pregunta es obligatoria.");
  if (!respuesta) throw new Error("La respuesta es obligatoria.");

  const palabrasClave = palabrasClaveRaw
    ? palabrasClaveRaw.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  await prisma.chatbotEntry.update({
    where: { id },
    data: { pregunta, respuesta, palabrasClave },
  });

  revalidatePath("/dashboard/chatbot-admin");
}

export async function eliminarEntrada(id: string) {
  await requireSuperAdmin();
  await prisma.chatbotEntry.delete({ where: { id } });
  revalidatePath("/dashboard/chatbot-admin");
}

export async function eliminarPreguntaSinResponder(id: string) {
  await requireSuperAdmin();
  await prisma.chatbotPreguntaSinResponder.delete({ where: { id } });
  revalidatePath("/dashboard/chatbot-admin");
}
