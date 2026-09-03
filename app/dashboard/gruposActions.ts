"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function esDirectivo(role?: string) {
  return role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION" || role === "SUPERADMIN" || role === "DIRECCION";
}

/**
 * La lista de cursos/grupos del centro del usuario logueado. La usan todos
 * los formularios con un campo "Curso" (alumnos, salidas, material...), da
 * igual el rol — cualquier usuario del centro puede LEER esta lista, solo
 * equipo directivo puede editarla (ver actualizarGruposDelCentro).
 */
export async function obtenerGruposDelCentro(): Promise<string[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return [];

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: { grupos: true },
  });
  return school?.grupos ?? [];
}

/**
 * Lista de profesores del centro (para asignar tutor al crear un alumno).
 * Incluye también Coordinador/Admin. de Centro, ya que también pueden
 * ejercer de tutores. Solo devuelve algo si quien pregunta es equipo
 * directivo: un Profesor no necesita esta lista, porque él mismo es
 * siempre el tutor de los alumnos que da de alta.
 */
export async function obtenerProfesoresParaTutor(): Promise<{ id: string; nombre: string }[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || !esDirectivo(session.user.role)) return [];

  const profesores = await prisma.user.findMany({
    where: { schoolId: session.user.schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return profesores.map((p) => ({ id: p.id, nombre: p.name ?? p.email }));
}

/** Si el usuario actual es equipo directivo (Coordinador/Admin. de Centro/SuperAdmin). */
export async function esUsuarioActualDirectivo(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return esDirectivo(session?.user.role);
}

/** El id del usuario con sesión iniciada — para poder preseleccionarlo
 * como tutor por defecto (equipo directivo también puede ser tutor de
 * sus propios alumnos, y así no tiene que buscarse en la lista cada vez). */
export async function obtenerMiUsuarioId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user.id ?? null;
}

/** Si el usuario actual es SuperAdmin (plataforma), no solo directivo de centro. */
export async function esUsuarioActualSuperAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user.role === "SUPERADMIN";
}

export async function actualizarGruposDelCentro(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || !esDirectivo(session.user.role)) {
    throw new Error("No autorizado.");
  }

  const gruposRaw = (formData.get("grupos") as string) ?? "";
  const grupos = gruposRaw
    .split("\n")
    .map((g) => g.trim())
    .filter(Boolean);

  await prisma.school.update({
    where: { id: session.user.schoolId },
    data: { grupos },
  });

  // Estas son todas las pantallas que muestran el desplegable de Curso/Grupo.
  revalidatePath("/dashboard/grupos");
  revalidatePath("/dashboard/mis-alumnos");
  revalidatePath("/dashboard/tutorias");
  revalidatePath("/dashboard/salidas");
  revalidatePath("/dashboard/material");
}
