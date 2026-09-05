"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DETALLE_MAX = 2000;

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

export async function obtenerDepartamentosParaSugerencia(schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  const schoolId = schoolIdParam ?? session?.user.schoolId;
  if (!schoolId) return [];

  const departamentos = await prisma.departamento.findMany({
    where: { schoolId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return departamentos;
}

// Equipo directivo/Dirección: TODAS las del centro, pero sin ningún dato
// de quién las escribió — son anónimas de verdad, ni siquiera ellos ven
// el autor.
// Profesorado: solo las suyas propias (ahí sí tiene sentido verlas, son
// las de uno mismo).
export async function obtenerSugerencias(schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];

  const schoolId = schoolIdParam ?? session.user.schoolId;
  if (!schoolId) return [];

  const puedeVerTodas = esDirectivo(session.user.role);

  const sugerencias = await prisma.sugerenciaProfesorado.findMany({
    where: {
      schoolId,
      ...(puedeVerTodas ? {} : { creadoPorId: session.user.id }),
    },
    include: { departamento: { select: { nombre: true } } },
    orderBy: { createdAt: "desc" },
  });

  return sugerencias.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    detalle: s.detalle,
    departamentoNombre: s.departamento?.nombre ?? null,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function crearSugerencia(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const schoolId = session.user.role === "SUPERADMIN" ? (formData.get("schoolId") as string) : session.user.schoolId;
  if (!schoolId) throw new Error("Falta el centro.");

  const titulo = (formData.get("titulo") as string)?.trim();
  if (!titulo) throw new Error("El título es obligatorio.");

  const detalle = (formData.get("detalle") as string)?.trim();
  if (!detalle) throw new Error("Explica tu sugerencia en el texto de detalles.");
  if (detalle.length > DETALLE_MAX) {
    throw new Error(`El texto no puede superar los ${DETALLE_MAX} caracteres.`);
  }

  const departamentoId = (formData.get("departamentoId") as string) || null;

  await prisma.sugerenciaProfesorado.create({
    data: {
      schoolId,
      departamentoId,
      titulo,
      detalle,
      creadoPorId: session.user.id,
    },
  });

  revalidatePath("/dashboard/sugerencias");
}
