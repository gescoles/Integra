"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

// El coordinador (o cualquier rol directivo) asigna un curso concreto
// del catálogo a un profesor concreto. El profesor recibe un aviso
// (notificación dentro de la app + correo si tiene) y, a partir de ahí,
// lo puede programar él mismo con el mismo formulario de siempre — pero
// ya viene "encargado", no elegido libremente.
export async function asignarCertificacionAProfesor(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación/Administración puede asignar certificaciones.");
  }

  const catalogoId = (formData.get("catalogoId") as string)?.trim();
  const profesorId = (formData.get("profesorId") as string)?.trim();
  if (!catalogoId) throw new Error("Elige un curso del catálogo.");
  if (!profesorId) throw new Error("Elige a qué profesor se lo asignas.");

  const [catalogo, profesor] = await Promise.all([
    prisma.certificacionCatalogo.findUnique({ where: { id: catalogoId } }),
    prisma.user.findUnique({ where: { id: profesorId }, select: { id: true, name: true, email: true, schoolId: true } }),
  ]);
  if (!catalogo) throw new Error("No se ha encontrado ese curso del catálogo.");
  if (!profesor || profesor.schoolId !== session.user.schoolId) throw new Error("Ese profesor no pertenece a tu centro.");

  const asignacion = await prisma.certificacionAsignacion.create({
    data: {
      schoolId: session.user.schoolId,
      catalogoId,
      profesorId,
      asignadoPorId: session.user.id,
    },
  });

  // Aviso dentro de la app — igual que el resto de avisos del sistema,
  // si falla no rompe la asignación en sí.
  try {
    await prisma.notificacion.create({
      data: {
        userId: profesorId,
        schoolId: session.user.schoolId,
        tipo: "certificacion_asignada",
        titulo: "Te han asignado una certificación",
        mensaje: `${session.user.name ?? "Coordinación"} te ha asignado "${catalogo.nombre}" para programar.`,
        link: "/dashboard/certificaciones",
        relatedId: asignacion.id,
      },
    });
  } catch (e) {
    console.error("No se pudo crear la notificación de asignación:", e);
  }

  try {
    if (profesor.email) {
      const { sendCertificacionAsignadaEmail } = await import("@/lib/email");
      await sendCertificacionAsignadaEmail({
        to: profesor.email,
        profesorNombre: profesor.name ?? profesor.email,
        cursoNombre: catalogo.nombre,
        categoria: catalogo.categoria,
        asignadoPorNombre: session.user.name ?? session.user.email ?? "Coordinación",
      });
    }
  } catch (e) {
    console.error("No se pudo enviar el correo de asignación:", e);
  }

  revalidatePath("/dashboard/certificaciones");
  return asignacion.id;
}

export async function eliminarAsignacion(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Coordinación/Administración puede quitar una asignación.");
  }

  const asignacion = await prisma.certificacionAsignacion.findUnique({ where: { id } });
  if (!asignacion || asignacion.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la asignación.");
  if (asignacion.certificacionId) {
    throw new Error("Esta asignación ya se ha programado; elimina la certificación en sí si hace falta quitarla.");
  }

  await prisma.certificacionAsignacion.delete({ where: { id } });
  revalidatePath("/dashboard/certificaciones");
}

// Para el profesor logueado: los cursos que le han asignado y todavía
// no ha programado.
export async function obtenerMisAsignacionesPendientes() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];

  const asignaciones = await prisma.certificacionAsignacion.findMany({
    where: { profesorId: session.user.id, certificacionId: null },
    include: {
      catalogo: true,
      asignadoPor: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return asignaciones.map((a) => ({
    id: a.id,
    catalogoId: a.catalogoId,
    cursoNombre: a.catalogo.nombre,
    categoria: a.catalogo.categoria,
    horasDefault: a.catalogo.horasDefault,
    asignadoPorNombre: a.asignadoPor?.name ?? a.asignadoPor?.email ?? "Coordinación",
    createdAt: a.createdAt.toISOString(),
  }));
}

// Para Coordinación: la foto completa de quién tiene qué asignado, y si
// ya lo ha programado, con toda la información que ha introducido.
export async function obtenerTodasLasAsignaciones() {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || !esDirectivo(session.user.role)) return [];

  const asignaciones = await prisma.certificacionAsignacion.findMany({
    where: { schoolId: session.user.schoolId },
    include: {
      catalogo: true,
      profesor: { select: { name: true, email: true } },
      asignadoPor: { select: { name: true, email: true } },
      certificacion: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return asignaciones.map((a) => ({
    id: a.id,
    profesorNombre: a.profesor.name ?? a.profesor.email,
    cursoNombre: a.catalogo.nombre,
    categoria: a.catalogo.categoria,
    asignadoPorNombre: a.asignadoPor?.name ?? a.asignadoPor?.email ?? "—",
    asignadoEl: a.createdAt.toISOString(),
    programada: Boolean(a.certificacion),
    // Solo tiene sentido si ya la ha programado — es la info que el
    // propio profesor ha introducido en su formulario.
    cicloFormativo: a.certificacion?.cicloFormativo ?? null,
    cursoAcademico: a.certificacion?.cursoAcademico ?? null,
    fechaInicioPreparacion: a.certificacion?.fechaInicioPreparacion?.toISOString() ?? null,
    fechaFinPreparacion: a.certificacion?.fechaFinPreparacion?.toISOString() ?? null,
    fechaExamen: a.certificacion?.fechaExamen?.toISOString() ?? null,
    estado: a.certificacion?.estado ?? null,
    sedeExamen: a.certificacion?.sedeExamen ?? null,
    notas: a.certificacion?.notas ?? null,
  }));
}

// Todos los profesores del centro, para el desplegable de "asignar a
// quién".
export async function obtenerProfesoresDelCentro() {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId || !esDirectivo(session.user.role)) return [];

  const profesores = await prisma.user.findMany({
    where: { schoolId: session.user.schoolId, role: "PROFESOR", status: "ACTIVO" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return profesores.map((p) => ({ id: p.id, nombre: p.name ?? p.email }));
}
