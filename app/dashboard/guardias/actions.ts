"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GuardiaStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendGuardiaEmail, sendCoberturaEmail } from "@/lib/email";
import { notifyUsers } from "@/lib/notifications";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO";
}

// Busca una cobertura: el profesor ausente, la franja horaria en la que
// falta, y quién está de guardia en ese mismo momento para poder cubrirle.
// Al confirmarlo, se avisa al sustituto por email + notificación en la app.
export async function crearCobertura(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación, Dirección o SuperAdmin puede asignar coberturas.");
  }

  const schoolId = (formData.get("schoolId") as string)?.trim();
  const profesorAusenteId = (formData.get("profesorAusenteId") as string)?.trim();
  const profesorSustitutoId = (formData.get("profesorSustitutoId") as string)?.trim();
  const fechaRaw = formData.get("fecha") as string;
  const horaInicio = (formData.get("horaInicio") as string)?.trim();
  const horaFin = (formData.get("horaFin") as string)?.trim();
  const asignatura = (formData.get("asignatura") as string)?.trim() || null;
  const grupo = (formData.get("grupo") as string)?.trim() || null;
  const ubicacion = (formData.get("ubicacion") as string)?.trim() || null;

  if (!schoolId) throw new Error("Falta el centro.");
  if (!profesorAusenteId) throw new Error("Elige el profesor que falta.");
  if (!profesorSustitutoId) throw new Error("Elige quién va a cubrir la clase.");
  if (!fechaRaw || !horaInicio || !horaFin) throw new Error("Faltan la fecha y la hora.");

  const [ausente, sustituto] = await Promise.all([
    prisma.user.findUnique({ where: { id: profesorAusenteId }, select: { name: true, email: true } }),
    prisma.user.findUnique({ where: { id: profesorSustitutoId }, select: { name: true, email: true } }),
  ]);
  if (!ausente) throw new Error("No se ha encontrado al profesor ausente.");
  if (!sustituto) throw new Error("No se ha encontrado al profesor sustituto.");

  const fecha = new Date(`${fechaRaw}T00:00:00Z`);

  const cobertura = await prisma.coberturaGuardia.create({
    data: {
      schoolId,
      profesorAusenteId,
      profesorSustitutoId,
      fecha,
      horaInicio,
      horaFin,
      asignatura,
      grupo,
      ubicacion,
      creadoPorId: session.user.id,
    },
  });

  const ausenteNombre = ausente.name ?? ausente.email;
  const sustitutoNombre = sustituto.name ?? sustituto.email;

  await notifyUsers([profesorSustitutoId], {
    schoolId,
    tipo: "COBERTURA_GUARDIA",
    titulo: "Tienes que cubrir una clase",
    mensaje: `${ausenteNombre} falta ${horaInicio}–${horaFin}${grupo ? ` · ${grupo}` : ""}`,
    link: "/dashboard/guardias",
    relatedId: cobertura.id,
  });

  try {
    if (sustituto.email) {
      await sendCoberturaEmail({
        to: sustituto.email,
        sustitutoNombre,
        ausenteNombre,
        asignatura,
        grupo,
        ubicacion,
        fecha,
        horaInicio,
        horaFin,
      });
    }
  } catch {
    // No pasa nada si falla el email; la notificación en la app ya ha avisado.
  }

  revalidatePath("/dashboard/guardias");
}

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
