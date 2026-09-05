"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");
  return session;
}

// SuperAdmin siempre puede editar; el resto solo si tiene el permiso
// individual activado (interruptor gestionado desde este mismo módulo).
async function puedeEditar(session: Awaited<ReturnType<typeof requireSession>>) {
  if (session.user.role === "SUPERADMIN") return true;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { puedeEditarCalendarioEscolar: true },
  });
  return user?.puedeEditarCalendarioEscolar ?? false;
}

// Para que el propio page.tsx sepa si debe pintar los botones de editar.
export async function obtenerPermisoPropioCalendarioEscolar() {
  const session = await requireSession();
  return puedeEditar(session);
}

export async function obtenerEventosCalendarioEscolar(schoolIdParam?: string) {
  const session = await requireSession();
  const schoolId = schoolIdParam ?? session.user.schoolId;
  if (!schoolId) return [];

  const eventos = await prisma.calendarioEscolarEvento.findMany({
    where: { schoolId },
    include: { creadoPor: { select: { name: true, email: true } } },
    orderBy: { fechaInicio: "asc" },
  });

  return eventos.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    fechaInicio: e.fechaInicio.toISOString(),
    fechaFin: e.fechaFin.toISOString(),
    festivo: e.festivo,
    creadoPorNombre: e.creadoPor.name ?? e.creadoPor.email,
  }));
}

function parseFecha(valor: FormDataEntryValue | null, campo: string): Date {
  const str = valor as string;
  if (!str) throw new Error(`Indica la ${campo}.`);
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function crearEventoCalendarioEscolar(formData: FormData) {
  const session = await requireSession();
  if (!(await puedeEditar(session))) throw new Error("No tienes permiso para editar el calendario escolar.");

  const schoolId = session.user.role === "SUPERADMIN" ? (formData.get("schoolId") as string) : session.user.schoolId;
  if (!schoolId) throw new Error("Falta el centro.");

  const titulo = (formData.get("titulo") as string)?.trim();
  if (!titulo) throw new Error("El título es obligatorio.");

  const fechaInicio = parseFecha(formData.get("fechaInicio"), "fecha de inicio");
  const fechaFinRaw = formData.get("fechaFin") as string;
  const fechaFin = fechaFinRaw ? parseFecha(formData.get("fechaFin"), "fecha de fin") : fechaInicio;
  if (fechaFin < fechaInicio) throw new Error("La fecha de fin no puede ser anterior a la de inicio.");

  const festivo = formData.get("festivo") === "on";

  await prisma.calendarioEscolarEvento.create({
    data: { schoolId, titulo, fechaInicio, fechaFin, festivo, creadoPorId: session.user.id },
  });

  revalidatePath("/dashboard/calendario");
}

export async function actualizarEventoCalendarioEscolar(id: string, formData: FormData) {
  const session = await requireSession();
  if (!(await puedeEditar(session))) throw new Error("No tienes permiso para editar el calendario escolar.");

  const titulo = (formData.get("titulo") as string)?.trim();
  if (!titulo) throw new Error("El título es obligatorio.");

  const fechaInicio = parseFecha(formData.get("fechaInicio"), "fecha de inicio");
  const fechaFinRaw = formData.get("fechaFin") as string;
  const fechaFin = fechaFinRaw ? parseFecha(formData.get("fechaFin"), "fecha de fin") : fechaInicio;
  if (fechaFin < fechaInicio) throw new Error("La fecha de fin no puede ser anterior a la de inicio.");

  const festivo = formData.get("festivo") === "on";

  await prisma.calendarioEscolarEvento.update({
    where: { id },
    data: { titulo, fechaInicio, fechaFin, festivo },
  });

  revalidatePath("/dashboard/calendario");
}

export async function eliminarEventoCalendarioEscolar(id: string) {
  const session = await requireSession();
  if (!(await puedeEditar(session))) throw new Error("No tienes permiso para editar el calendario escolar.");

  await prisma.calendarioEscolarEvento.delete({ where: { id } });
  revalidatePath("/dashboard/calendario");
}

// Panel de SuperAdmin: a qué profesores del centro se les ha dado permiso
// de edición individual sobre el calendario escolar.
export async function obtenerProfesoresConPermisoCalendario(schoolId: string) {
  const session = await requireSession();
  if (session.user.role !== "SUPERADMIN") throw new Error("No autorizado.");

  const profesores = await prisma.user.findMany({
    where: { schoolId, role: { not: "SUPERADMIN" } },
    select: { id: true, name: true, email: true, role: true, puedeEditarCalendarioEscolar: true },
    orderBy: { name: "asc" },
  });

  return profesores;
}

export async function actualizarPermisoCalendarioEscolar(userId: string, permitido: boolean) {
  const session = await requireSession();
  if (session.user.role !== "SUPERADMIN") throw new Error("No autorizado.");

  await prisma.user.update({
    where: { id: userId },
    data: { puedeEditarCalendarioEscolar: permitido },
  });

  revalidatePath("/dashboard/calendario");
}
