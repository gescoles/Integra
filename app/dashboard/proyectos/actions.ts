"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { formatearCiclo } from "./cicloFormat";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

export async function obtenerVentanasProyecto() {
  return prisma.proyectoVentana.findMany({ orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
}

// Lista de ciclos del centro para el selector del formulario: uno por
// cada curso/grupo real ya configurado (School.grupos), sin mezclar 1r y
// 2n en uno solo — un proyecto se hace dentro de un curso concreto, no a
// caballo entre dos. El "value" es el curso/grupo exacto (el mismo que
// ya usa Alumno.curso); el "label" es solo para que se vea mejor en el
// desplegable ("DAM - 1r" en vez de "DAM1").
export async function obtenerCiclosDelCentro(schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  const schoolId = schoolIdParam ?? session?.user.schoolId;
  if (!schoolId) return [];

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { grupos: true } });
  return (school?.grupos ?? [])
    .map((g) => ({ value: g, label: formatearCiclo(g) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Alumnos de un ciclo (curso/grupo exacto del centro) — 1r y 2n nunca se
// mezclan, cada uno es su propia opción en el selector.
export async function obtenerAlumnosPorCiclo(ciclo: string, schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  const schoolId = schoolIdParam ?? session?.user.schoolId;
  if (!schoolId || !ciclo) return [];

  const alumnos = await prisma.alumno.findMany({
    where: { schoolId, curso: ciclo },
    select: { id: true, nombre: true, curso: true },
    orderBy: { nombre: "asc" },
  });

  return alumnos.map((a) => ({ id: a.id, nombre: a.nombre, curso: a.curso }));
}

// Plantilla de "tipos de nota" para un nuevo grupo: se reutilizan el
// nombre y el porcentaje de cada tipo de nota del último grupo creado en
// esa misma ventana+ciclo (de cualquier profesor del centro, no solo el
// suyo — es la rúbrica del proyecto, no algo privado), para que al crear
// el segundo grupo en adelante solo haga falta elegir a los alumnos y
// poner las notas, sin volver a montar los mismos apartados cada vez. El
// valor y el comentario nunca se copian, son propios de cada grupo.
export async function obtenerPlantillaNotas(ventanaId: string, ciclo: string, schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  const schoolId = schoolIdParam ?? session?.user.schoolId;
  if (!schoolId || !ventanaId || !ciclo) return [];

  const ultimoGrupo = await prisma.proyectoGrupo.findFirst({
    where: { schoolId, ventanaId, ciclo },
    orderBy: { createdAt: "desc" },
    include: { notas: { orderBy: { createdAt: "asc" } } },
  });

  if (!ultimoGrupo) return [];
  return ultimoGrupo.notas.map((n) => ({ nombre: n.nombre, porcentaje: n.porcentaje }));
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

type NotaInput = { nombre: string; porcentaje: number; valor: number; comentario: string | null };

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
    const comentarioTexto = String(registro?.comentario ?? "").trim();
    const comentario = comentarioTexto || null;

    if (!nombre) throw new Error("Cada tipo de nota necesita un nombre.");
    if (!Number.isFinite(porcentaje) || porcentaje <= 0) {
      throw new Error(`El porcentaje de "${nombre}" no es válido.`);
    }
    if (!Number.isFinite(valor) || valor < 0 || valor > 10) {
      throw new Error(`El valor de "${nombre}" es obligatorio y tiene que estar entre 0 y 10.`);
    }

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
