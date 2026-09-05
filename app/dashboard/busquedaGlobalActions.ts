"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLE_LABELS_FULL } from "./constants";

export type ResultadoBusquedaGlobal = {
  tipo: "alumno" | "profesor" | "empresa" | "grupo";
  id: string;
  titulo: string;
  subtitulo: string | null;
  // Solo se rellena cuando existe de verdad una página propia de ese
  // registro a la que ir (hoy en día, solo Empresas la tiene). Alumnos,
  // profesorado y grupos no tienen ficha propia en ninguna URL — su
  // información completa se muestra aquí mismo, en el modal flotante, así
  // que no hay ningún sitio real al que enviar a nadie con un botón.
  href: string | null;
  // Pares etiqueta/valor con la información completa, para mostrar en
  // la ficha flotante sin tener que navegar a otra pantalla.
  detalle: { label: string; value: string }[];
};

// Solo lectura, no toca ningún módulo — busca en paralelo en Alumno,
// User (profesorado), Empresa, y en los grupos/ciclos del centro.
export async function buscarGlobal(query: string): Promise<ResultadoBusquedaGlobal[]> {
  const session = await getServerSession(authOptions);
  const schoolId = session?.user.schoolId;
  const texto = query.trim();
  if (!schoolId || texto.length < 2) return [];

  const [alumnos, profesores, empresas, school] = await Promise.all([
    prisma.alumno.findMany({
      where: { schoolId, nombre: { contains: texto, mode: "insensitive" } },
      select: {
        id: true,
        nombre: true,
        curso: true,
        riesgo: true,
        fechaNacimiento: true,
        profesor: { select: { name: true, email: true } },
        contactos: { select: { relacion: true, telefono: true, email: true } },
      },
      take: 6,
    }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION", "DIRECCION"] },
        OR: [{ name: { contains: texto, mode: "insensitive" } }, { email: { contains: texto, mode: "insensitive" } }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departamentos: {
          select: { nombre: true, coordinadores: { select: { id: true, name: true, email: true } } },
        },
      },
      take: 6,
    }),
    prisma.empresa.findMany({
      where: {
        schoolId,
        OR: [{ nombreComercial: { contains: texto, mode: "insensitive" } }, { razonSocial: { contains: texto, mode: "insensitive" } }],
      },
      select: { id: true, nombreComercial: true, razonSocial: true, sector: true, correoCorporativo: true, sitioWeb: true },
      take: 6,
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { grupos: true } }),
  ]);

  const resultados: ResultadoBusquedaGlobal[] = [];

  for (const a of alumnos) {
    const madre = a.contactos.find((c) => c.relacion === "Madre");
    const padre = a.contactos.find((c) => c.relacion === "Padre");
    const contacto = madre ?? padre;
    resultados.push({
      tipo: "alumno",
      id: a.id,
      titulo: a.nombre,
      subtitulo: a.curso,
      href: null,
      detalle: [
        { label: "Curso / grupo", value: a.curso },
        { label: "Tutor/a", value: a.profesor.name ?? a.profesor.email },
        { label: "Nivel de riesgo", value: a.riesgo },
        ...(a.fechaNacimiento ? [{ label: "Fecha de nacimiento", value: new Date(a.fechaNacimiento).toLocaleDateString("es-ES") }] : []),
        ...(contacto?.telefono ? [{ label: `Teléfono (${contacto.relacion})`, value: contacto.telefono }] : []),
        ...(contacto?.email ? [{ label: `Correo (${contacto.relacion})`, value: contacto.email }] : []),
      ],
    });
  }

  for (const p of profesores) {
    const nombresDepartamentos = p.departamentos.map((d) => d.nombre).join(", ");
    // Coordinadores de sus departamentos, sin repetir y sin contarse a sí
    // mismo si él mismo coordina alguno de los suyos.
    const coordinadoresUnicos = new Map<string, string>();
    for (const d of p.departamentos) {
      for (const c of d.coordinadores) {
        if (c.id !== p.id) coordinadoresUnicos.set(c.id, c.name ?? c.email);
      }
    }
    const nombresCoordinadores = Array.from(coordinadoresUnicos.values()).join(", ");

    resultados.push({
      tipo: "profesor",
      id: p.id,
      titulo: p.name ?? p.email,
      subtitulo: ROLE_LABELS_FULL[p.role] ?? p.role,
      href: null,
      detalle: [
        { label: "Rol", value: ROLE_LABELS_FULL[p.role] ?? p.role },
        { label: "Correo", value: p.email },
        { label: "Departamento", value: nombresDepartamentos || "Sin departamento asignado" },
        ...(nombresCoordinadores ? [{ label: "Coordinador/a", value: nombresCoordinadores }] : []),
      ],
    });
  }

  for (const e of empresas) {
    resultados.push({
      tipo: "empresa",
      id: e.id,
      titulo: e.nombreComercial,
      subtitulo: e.sector,
      href: `/dashboard/empresas/${e.id}`,
      detalle: [
        { label: "Razón social", value: e.razonSocial },
        ...(e.sector ? [{ label: "Departamento", value: e.sector }] : []),
        ...(e.correoCorporativo ? [{ label: "Correo", value: e.correoCorporativo }] : []),
        ...(e.sitioWeb ? [{ label: "Sitio web", value: e.sitioWeb }] : []),
      ],
    });
  }

  const grupoTexto = texto.toLowerCase();
  const gruposCoincidentes = (school?.grupos ?? []).filter((g) => g.toLowerCase().includes(grupoTexto)).slice(0, 6);
  for (const g of gruposCoincidentes) {
    const totalAlumnos = await prisma.alumno.count({ where: { schoolId, curso: g } });
    resultados.push({
      tipo: "grupo",
      id: g,
      titulo: g,
      subtitulo: "Grupo / ciclo",
      href: null,
      detalle: [{ label: "Alumnos en este grupo", value: String(totalAlumnos) }],
    });
  }

  return resultados;
}
