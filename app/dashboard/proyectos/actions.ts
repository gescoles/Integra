"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

// Ciclo formativo agrupado a partir de un curso/grupo del centro (p. ej.
// "DAM1"/"DAM2" -> "DAM") — misma lógica que ya existe en Prácticas
// (app/dashboard/practicas/actions.ts::cicloDeGrupo), duplicada aquí a
// propósito para no acoplar dos módulos independientes entre sí.
function cicloDeGrupo(grupo: string): string {
  return grupo.replace(/\d+$/, "").trim().toUpperCase();
}

export async function obtenerVentanasProyecto() {
  return prisma.proyectoVentana.findMany({ orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
}

// Lista de ciclos formativos agrupados del centro, a partir de los
// cursos/grupos ya configurados (School.grupos) — para el selector de
// "ciclo" del formulario.
export async function obtenerCiclosDelCentro(schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  const schoolId = schoolIdParam ?? session?.user.schoolId;
  if (!schoolId) return [];

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { grupos: true } });
  const ciclos = new Set((school?.grupos ?? []).map(cicloDeGrupo).filter(Boolean));
  return Array.from(ciclos).sort();
}

// Alumnos de un ciclo agrupado concreto (todos los cursos que caen dentro
// de ese ciclo, p. ej. "DAM" -> alumnos de DAM1 y DAM2 a la vez).
export async function obtenerAlumnosPorCiclo(ciclo: string, schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  const schoolId = schoolIdParam ?? session?.user.schoolId;
  if (!schoolId || !ciclo) return [];

  const alumnos = await prisma.alumno.findMany({
    where: { schoolId },
    select: { id: true, nombre: true, curso: true },
    orderBy: { nombre: "asc" },
  });

  return alumnos
    .filter((a) => cicloDeGrupo(a.curso) === ciclo)
    .map((a) => ({ id: a.id, nombre: a.nombre, curso: a.curso }));
}

// Listado de grupos/proyectos de una ventana, con el permiso "veo lo mío
// vs. veo todo" ya aplicado: un profesor solo ve los suyos; Dirección y el
// resto del equipo directivo ven todos los del centro, con filtros
// opcionales por ciclo y por nombre.
export async function obtenerGruposProyecto(
  ventanaId: string,
  opts?: { schoolId?: string; ciclo?: string; nombre?: string }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];

  const schoolId = opts?.schoolId ?? session.user.schoolId;
  if (!schoolId || !ventanaId) return [];

  const puedeVerTodos = esDirectivo(session.user.role);

  const grupos = await prisma.proyectoGrupo.findMany({
    where: {
      schoolId,
      ventanaId,
      ...(puedeVerTodos ? {} : { creadoPorId: session.user.id }),
      ...(opts?.ciclo ? { ciclo: opts.ciclo } : {}),
      ...(opts?.nombre ? { nombre: { contains: opts.nombre, mode: "insensitive" } } : {}),
    },
    include: {
      creadoPor: { select: { id: true, name: true, email: true } },
      notas: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Nombres de los alumnos de todos los grupos de una sola vez, para no
  // hacer una consulta por grupo (alumnosIds es un array plano de ids).
  const idsAlumnos = Array.from(new Set(grupos.flatMap((g) => g.alumnosIds)));
  const alumnos =
    idsAlumnos.length > 0
      ? await prisma.alumno.findMany({ where: { id: { in: idsAlumnos } }, select: { id: true, nombre: true } })
      : [];
  const nombrePorId = new Map(alumnos.map((a) => [a.id, a.nombre]));

  return grupos.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    ciclo: g.ciclo,
    fechaEntrega: g.fechaEntrega.toISOString(),
    comentarios: g.comentarios,
    notaFinal: g.notaFinal,
    creadoPorId: g.creadoPorId,
    creadoPorNombre: g.creadoPor.name ?? g.creadoPor.email,
    alumnosIds: g.alumnosIds,
    alumnosNombres: g.alumnosIds.map((id) => nombrePorId.get(id) ?? "—"),
    notas: g.notas.map((n) => ({
      id: n.id,
      nombre: n.nombre,
      porcentaje: n.porcentaje,
      valor: n.valor,
      comentario: n.comentario,
    })),
  }));
}

type NotaInput = { nombre: string; porcentaje: number; valor: number; comentario: string };

// Todos los campos son obligatorios (se pidió expresamente): tiene que
// haber al menos un tipo de nota, y los porcentajes tienen que sumar
// exactamente 100% — si no, se rechaza el guardado entero, no se permite
// un grupo a medio calificar.
function calcularNotaFinal(notas: NotaInput[]): number {
  const sumaPorcentajes = Math.round(notas.reduce((s, n) => s + n.porcentaje, 0) * 100) / 100;
  if (Math.abs(sumaPorcentajes - 100) > 0.01) {
    throw new Error(`Los porcentajes de los tipos de nota tienen que sumar 100% (ahora suman ${sumaPorcentajes}%).`);
  }

  const suma = notas.reduce((s, n) => s + n.valor * n.porcentaje, 0);
  return Math.round((suma / 100) * 100) / 100;
}

function parseNotas(raw: FormDataEntryValue | null): NotaInput[] {
  if (!raw || typeof raw !== "string") throw new Error("Añade al menos un tipo de nota.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Los tipos de nota no se han podido leer.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Añade al menos un tipo de nota.");

  return parsed.map((n) => {
    const registro = n as Record<string, unknown>;
    const nombre = String(registro?.nombre ?? "").trim();
    const porcentaje = Number(registro?.porcentaje);
    const valorRaw = registro?.valor;
    const valor = valorRaw === null || valorRaw === undefined || valorRaw === "" ? NaN : Number(valorRaw);
    const comentario = String(registro?.comentario ?? "").trim();

    if (!nombre) throw new Error("Cada tipo de nota necesita un nombre.");
    if (!Number.isFinite(porcentaje) || porcentaje <= 0) {
      throw new Error(`El porcentaje de "${nombre}" no es válido.`);
    }
    if (!Number.isFinite(valor) || valor < 0 || valor > 10) {
      throw new Error(`El valor de "${nombre}" es obligatorio y tiene que estar entre 0 y 10.`);
    }
    if (!comentario) throw new Error(`El comentario de "${nombre}" es obligatorio.`);

    return { nombre, porcentaje, valor, comentario };
  });
}

export async function crearProyectoGrupo(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  // El SuperAdmin no tiene centro propio — está supervisando el que haya
  // elegido con el selector de centro, así que ese es el único caso en
  // el que se acepta un schoolId que venga del formulario en vez del de
  // la sesión (para cualquier otro rol, siempre se usa el suyo propio,
  // nunca uno que pueda venir manipulado desde el formulario).
  const schoolId = session.user.role === "SUPERADMIN" ? (formData.get("schoolId") as string) : session.user.schoolId;
  if (!schoolId) throw new Error("No autorizado.");

  const ventanaId = formData.get("ventanaId") as string;
  const nombre = (formData.get("nombre") as string)?.trim();
  const ciclo = (formData.get("ciclo") as string)?.trim();
  const fechaEntregaRaw = formData.get("fechaEntrega") as string;
  const comentarios = (formData.get("comentarios") as string)?.trim();
  const alumnosIds = formData.getAll("alumnosIds").map(String).filter(Boolean);
  const notas = parseNotas(formData.get("notas"));

  if (!ventanaId) throw new Error("Falta la ventana.");
  if (!nombre) throw new Error("El nombre del grupo/proyecto es obligatorio.");
  if (!ciclo) throw new Error("Elige un ciclo.");
  if (!fechaEntregaRaw) throw new Error("La fecha de entrega es obligatoria.");
  if (!comentarios) throw new Error("Los comentarios son obligatorios.");
  if (alumnosIds.length === 0) throw new Error("Selecciona al menos un alumno.");

  const notaFinal = calcularNotaFinal(notas);

  await prisma.proyectoGrupo.create({
    data: {
      schoolId,
      ventanaId,
      nombre,
      ciclo,
      alumnosIds,
      fechaEntrega: new Date(fechaEntregaRaw),
      comentarios,
      notaFinal,
      creadoPorId: session.user.id,
      notas: { create: notas },
    },
  });

  revalidatePath("/dashboard/proyectos");
}

export async function actualizarProyectoGrupo(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const grupo = await prisma.proyectoGrupo.findUnique({ where: { id }, select: { creadoPorId: true } });
  if (!grupo) throw new Error("Ese proyecto ya no existe.");
  if (grupo.creadoPorId !== session.user.id && !esDirectivo(session.user.role)) {
    throw new Error("No puedes editar un proyecto que no has creado.");
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const ciclo = (formData.get("ciclo") as string)?.trim();
  const fechaEntregaRaw = formData.get("fechaEntrega") as string;
  const comentarios = (formData.get("comentarios") as string)?.trim();
  const alumnosIds = formData.getAll("alumnosIds").map(String).filter(Boolean);
  const notas = parseNotas(formData.get("notas"));

  if (!nombre) throw new Error("El nombre del grupo/proyecto es obligatorio.");
  if (!ciclo) throw new Error("Elige un ciclo.");
  if (!fechaEntregaRaw) throw new Error("La fecha de entrega es obligatoria.");
  if (!comentarios) throw new Error("Los comentarios son obligatorios.");
  if (alumnosIds.length === 0) throw new Error("Selecciona al menos un alumno.");

  const notaFinal = calcularNotaFinal(notas);

  await prisma.$transaction([
    prisma.proyectoNota.deleteMany({ where: { proyectoGrupoId: id } }),
    prisma.proyectoGrupo.update({
      where: { id },
      data: {
        nombre,
        ciclo,
        alumnosIds,
        fechaEntrega: new Date(fechaEntregaRaw),
        comentarios,
        notaFinal,
        notas: { create: notas },
      },
    }),
  ]);

  revalidatePath("/dashboard/proyectos");
}

export async function eliminarProyectoGrupo(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const grupo = await prisma.proyectoGrupo.findUnique({ where: { id }, select: { creadoPorId: true } });
  if (!grupo) return;
  if (grupo.creadoPorId !== session.user.id && !esDirectivo(session.user.role)) {
    throw new Error("No puedes eliminar un proyecto que no has creado.");
  }

  await prisma.proyectoGrupo.delete({ where: { id } });
  revalidatePath("/dashboard/proyectos");
}
