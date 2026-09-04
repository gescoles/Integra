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

// Listado de Proyectos (el nivel "clase + rúbrica") de una ventana: se ve
// TODOS los del centro (cualquiera puede añadir su propio grupo dentro de
// uno ya creado por otro profesor, es la rúbrica compartida de la clase),
// pero cada uno trae solo los ProyectoGrupo que el usuario puede ver —
// los suyos, o todos si es Dirección/equipo directivo — ya filtrados y
// con filtros opcionales por nombre de grupo.
export async function obtenerProyectos(
  ventanaId: string,
  opts?: { schoolId?: string; ciclo?: string; nombre?: string }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];

  const schoolId = opts?.schoolId ?? session.user.schoolId;
  if (!schoolId || !ventanaId) return [];

  const puedeVerTodos = esDirectivo(session.user.role);

  const proyectos = await prisma.proyecto.findMany({
    where: {
      schoolId,
      ventanaId,
      ...(opts?.ciclo ? { ciclo: opts.ciclo } : {}),
    },
    include: {
      creadoPor: { select: { id: true, name: true, email: true } },
      tiposNota: { orderBy: { createdAt: "asc" } },
      grupos: {
        where: {
          ...(puedeVerTodos ? {} : { creadoPorId: session.user.id }),
          ...(opts?.nombre ? { nombre: { contains: opts.nombre, mode: "insensitive" } } : {}),
        },
        include: {
          creadoPor: { select: { id: true, name: true, email: true } },
          notas: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Si se está filtrando por nombre de grupo, no tiene sentido mostrar un
  // proyecto que se ha quedado sin ningún grupo visible tras el filtro.
  const proyectosFiltrados = opts?.nombre ? proyectos.filter((p) => p.grupos.length > 0) : proyectos;

  const idsAlumnos = Array.from(new Set(proyectosFiltrados.flatMap((p) => p.grupos.flatMap((g) => g.alumnosIds))));
  const alumnos =
    idsAlumnos.length > 0
      ? await prisma.alumno.findMany({ where: { id: { in: idsAlumnos } }, select: { id: true, nombre: true } })
      : [];
  const nombrePorId = new Map(alumnos.map((a) => [a.id, a.nombre]));

  return proyectosFiltrados.map((p) => ({
    id: p.id,
    ciclo: p.ciclo,
    creadoPorId: p.creadoPorId,
    creadoPorNombre: p.creadoPor.name ?? p.creadoPor.email,
    createdAt: p.createdAt.toISOString(),
    tiposNota: p.tiposNota.map((t) => ({ id: t.id, nombre: t.nombre, porcentaje: t.porcentaje })),
    grupos: p.grupos.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      fechaEntrega: g.fechaEntrega.toISOString(),
      comentarios: g.comentarios,
      notaFinal: g.notaFinal,
      creadoPorId: g.creadoPorId,
      creadoPorNombre: g.creadoPor.name ?? g.creadoPor.email,
      alumnosIds: g.alumnosIds,
      alumnosNombres: g.alumnosIds.map((id) => nombrePorId.get(id) ?? "—"),
      notas: g.notas.map((n) => ({ id: n.id, tipoNotaId: n.tipoNotaId, valor: n.valor, comentario: n.comentario })),
    })),
  }));
}

type TipoNotaInput = { nombre: string; porcentaje: number };

function parseTiposNota(raw: FormDataEntryValue | null): TipoNotaInput[] {
  if (!raw || typeof raw !== "string") throw new Error("Añade al menos un tipo de nota.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Los tipos de nota no se han podido leer.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Añade al menos un tipo de nota.");

  const tipos = parsed.map((n) => {
    const registro = n as Record<string, unknown>;
    const nombre = String(registro?.nombre ?? "").trim();
    const porcentaje = Number(registro?.porcentaje);
    if (!nombre) throw new Error("Cada tipo de nota necesita un nombre.");
    if (!Number.isFinite(porcentaje) || porcentaje <= 0) {
      throw new Error(`El porcentaje de "${nombre}" no es válido.`);
    }
    return { nombre, porcentaje };
  });

  const suma = Math.round(tipos.reduce((s, t) => s + t.porcentaje, 0) * 100) / 100;
  if (Math.abs(suma - 100) > 0.01) {
    throw new Error(`Los porcentajes de los tipos de nota tienen que sumar 100% (ahora suman ${suma}%).`);
  }

  return tipos;
}

// Crea el "Proyecto" — la clase con su ciclo y su rúbrica fija (tipos de
// nota + porcentaje). Cualquier rol con el módulo puede crearlo; queda
// registrado como suyo, pero cualquier otro profesor del centro podrá
// añadir después su propio grupo dentro de él.
export async function crearProyecto(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const schoolId = session.user.role === "SUPERADMIN" ? (formData.get("schoolId") as string) : session.user.schoolId;
  if (!schoolId) throw new Error("No autorizado.");

  const ventanaId = formData.get("ventanaId") as string;
  const ciclo = (formData.get("ciclo") as string)?.trim();
  const tiposNota = parseTiposNota(formData.get("tiposNota"));

  if (!ventanaId) throw new Error("Falta la ventana.");
  if (!ciclo) throw new Error("Elige un ciclo.");

  await prisma.proyecto.create({
    data: {
      schoolId,
      ventanaId,
      ciclo,
      creadoPorId: session.user.id,
      tiposNota: { create: tiposNota },
    },
  });

  revalidatePath("/dashboard/proyectos");
}

// Solo se puede eliminar un Proyecto si ya no tiene ningún grupo dentro
// (podrían ser de otros profesores) — hay que vaciarlo primero.
export async function eliminarProyecto(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { creadoPorId: true, _count: { select: { grupos: true } } },
  });
  if (!proyecto) return;
  if (proyecto.creadoPorId !== session.user.id && !esDirectivo(session.user.role)) {
    throw new Error("No puedes eliminar un proyecto que no has creado.");
  }
  if (proyecto._count.grupos > 0) {
    throw new Error(`No se puede eliminar: todavía hay ${proyecto._count.grupos} grupo(s) dentro. Bórralos primero.`);
  }

  await prisma.proyecto.delete({ where: { id } });
  revalidatePath("/dashboard/proyectos");
}

type NotaValorInput = { tipoNotaId: string; valor: number; comentario: string | null };

function parseNotasValores(raw: FormDataEntryValue | null): NotaValorInput[] {
  if (!raw || typeof raw !== "string") throw new Error("Faltan las notas del grupo.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Las notas no se han podido leer.");
  }
  if (!Array.isArray(parsed)) throw new Error("Las notas no son válidas.");

  return parsed.map((n) => {
    const registro = n as Record<string, unknown>;
    const tipoNotaId = String(registro?.tipoNotaId ?? "");
    const valorRaw = registro?.valor;
    const valor = valorRaw === null || valorRaw === undefined || valorRaw === "" ? NaN : Number(valorRaw);
    const comentarioTexto = String(registro?.comentario ?? "").trim();

    if (!tipoNotaId) throw new Error("Falta identificar algún tipo de nota.");
    if (!Number.isFinite(valor) || valor < 0 || valor > 10) {
      throw new Error("Cada nota es obligatoria y tiene que estar entre 0 y 10.");
    }

    return { tipoNotaId, valor, comentario: comentarioTexto || null };
  });
}

// Calcula la nota final ponderada del grupo a partir de la rúbrica REAL
// del proyecto (nunca de lo que venga del formulario, por seguridad) y
// las notas puestas para este grupo — hacen falta todos los tipos de
// nota de la rúbrica, ni uno más ni uno menos.
function calcularNotaFinal(
  tiposNota: { id: string; porcentaje: number }[],
  notas: NotaValorInput[]
): number {
  if (notas.length !== tiposNota.length) {
    throw new Error("Faltan notas por poner para completar la rúbrica del proyecto.");
  }
  const porcentajePorTipo = new Map(tiposNota.map((t) => [t.id, t.porcentaje]));
  let suma = 0;
  for (const n of notas) {
    const porcentaje = porcentajePorTipo.get(n.tipoNotaId);
    if (porcentaje === undefined) throw new Error("Alguna nota no pertenece a la rúbrica de este proyecto.");
    suma += n.valor * porcentaje;
  }
  return Math.round((suma / 100) * 100) / 100;
}

export async function crearProyectoGrupo(proyectoId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: { tiposNota: true },
  });
  if (!proyecto) throw new Error("Ese proyecto ya no existe.");

  const nombre = (formData.get("nombre") as string)?.trim();
  const fechaEntregaRaw = formData.get("fechaEntrega") as string;
  const comentarios = (formData.get("comentarios") as string)?.trim();
  const alumnosIds = formData.getAll("alumnosIds").map(String).filter(Boolean);
  const notas = parseNotasValores(formData.get("notas"));

  if (!nombre) throw new Error("El nombre del grupo es obligatorio.");
  if (!fechaEntregaRaw) throw new Error("La fecha de entrega es obligatoria.");
  if (!comentarios) throw new Error("Los comentarios son obligatorios.");
  if (alumnosIds.length === 0) throw new Error("Selecciona al menos un alumno.");

  const notaFinal = calcularNotaFinal(proyecto.tiposNota, notas);

  await prisma.proyectoGrupo.create({
    data: {
      proyectoId,
      nombre,
      alumnosIds,
      fechaEntrega: new Date(fechaEntregaRaw),
      comentarios,
      notaFinal,
      creadoPorId: session.user.id,
      notas: { create: notas.map((n) => ({ tipoNotaId: n.tipoNotaId, valor: n.valor, comentario: n.comentario })) },
    },
  });

  revalidatePath("/dashboard/proyectos");
}

export async function actualizarProyectoGrupo(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const grupo = await prisma.proyectoGrupo.findUnique({
    where: { id },
    select: { creadoPorId: true, proyecto: { include: { tiposNota: true } } },
  });
  if (!grupo) throw new Error("Ese grupo ya no existe.");
  if (grupo.creadoPorId !== session.user.id && !esDirectivo(session.user.role)) {
    throw new Error("No puedes editar un grupo que no has creado.");
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const fechaEntregaRaw = formData.get("fechaEntrega") as string;
  const comentarios = (formData.get("comentarios") as string)?.trim();
  const alumnosIds = formData.getAll("alumnosIds").map(String).filter(Boolean);
  const notas = parseNotasValores(formData.get("notas"));

  if (!nombre) throw new Error("El nombre del grupo es obligatorio.");
  if (!fechaEntregaRaw) throw new Error("La fecha de entrega es obligatoria.");
  if (!comentarios) throw new Error("Los comentarios son obligatorios.");
  if (alumnosIds.length === 0) throw new Error("Selecciona al menos un alumno.");

  const notaFinal = calcularNotaFinal(grupo.proyecto.tiposNota, notas);

  await prisma.$transaction([
    prisma.proyectoNota.deleteMany({ where: { proyectoGrupoId: id } }),
    prisma.proyectoGrupo.update({
      where: { id },
      data: {
        nombre,
        alumnosIds,
        fechaEntrega: new Date(fechaEntregaRaw),
        comentarios,
        notaFinal,
        notas: { create: notas.map((n) => ({ tipoNotaId: n.tipoNotaId, valor: n.valor, comentario: n.comentario })) },
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
    throw new Error("No puedes eliminar un grupo que no has creado.");
  }

  await prisma.proyectoGrupo.delete({ where: { id } });
  revalidatePath("/dashboard/proyectos");
}
