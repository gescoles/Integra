"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GuardiaStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendGuardiaEmail } from "@/lib/email";

export async function updateGuardiaStatus(id: string, status: GuardiaStatus) {
  await prisma.guardia.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/guardias");
  revalidatePath("/dashboard");
}

export async function createGuardia(formData: FormData) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  if (!session?.user.id || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO")) {
    throw new Error("No autorizado.");
  }

  const schoolId = (formData.get("schoolId") as string)?.trim();
  const profesorId = (formData.get("profesorId") as string)?.trim();
  const turno = (formData.get("turno") as string)?.trim();
  const ubicacion = (formData.get("ubicacion") as string)?.trim();
  const grupo = (formData.get("grupo") as string)?.trim();
  const tarea = (formData.get("tarea") as string)?.trim();
  const fechaRaw = formData.get("fecha") as string;
  const horaRaw = formData.get("hora") as string;

  if (!schoolId) throw new Error("Falta el centro.");
  if (!profesorId) throw new Error("Elige el profesor al que asignar la guardia.");
  if (!turno) throw new Error("El turno es obligatorio.");
  if (!fechaRaw) throw new Error("La fecha es obligatoria.");
  if (!horaRaw) throw new Error("La hora es obligatoria.");

  const fecha = new Date(`${fechaRaw}T${horaRaw}:00`);
  if (Number.isNaN(fecha.getTime())) throw new Error("Fecha u hora no válidas.");

  const profesor = await prisma.user.findUnique({
    where: { id: profesorId },
    select: { name: true, email: true },
  });
  if (!profesor) throw new Error("No se ha encontrado el profesor.");

  await prisma.guardia.create({
    data: {
      schoolId,
      profesorId,
      turno,
      ubicacion: ubicacion || null,
      grupo: grupo || null,
      tarea: tarea || null,
      fecha,
    },
  });

  revalidatePath("/dashboard/guardias");
  revalidatePath("/dashboard");

  // El email y el evento de Teams son "mejor esfuerzo": si Microsoft o el
  // correo fallan, la guardia YA se ha guardado correctamente y no queremos
  // que el usuario vea un error como si no se hubiera creado. Cada aviso
  // se intenta por separado para que un fallo no tumbe al otro.
  const profesorNombre = profesor.name ?? profesor.email;
  const avisos: { canal: string; ok: boolean; error?: string }[] = [];

  try {
    await sendGuardiaEmail({
      to: profesor.email,
      profesorName: profesorNombre,
      turno,
      ubicacion: ubicacion || null,
      grupo: grupo || null,
      tarea: tarea || null,
      fecha,
    });
    avisos.push({ canal: "email", ok: true });
  } catch (e) {
    avisos.push({ canal: "email", ok: false, error: e instanceof Error ? e.message : "Error desconocido" });
  }

  return { avisos };
}
