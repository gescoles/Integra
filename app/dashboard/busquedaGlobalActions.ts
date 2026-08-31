"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ResultadoBusquedaGlobal = {
  tipo: "alumno" | "profesor" | "empresa" | "grupo";
  id: string;
  titulo: string;
  subtitulo: string | null;
  href: string;
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
      select: { id: true, nombre: true, curso: true },
      take: 6,
    }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION"] },
        OR: [{ name: { contains: texto, mode: "insensitive" } }, { email: { contains: texto, mode: "insensitive" } }],
      },
      select: { id: true, name: true, email: true, role: true },
      take: 6,
    }),
    prisma.empresa.findMany({
      where: {
        schoolId,
        OR: [{ nombreComercial: { contains: texto, mode: "insensitive" } }, { razonSocial: { contains: texto, mode: "insensitive" } }],
      },
      select: { id: true, nombreComercial: true, sector: true },
      take: 6,
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { grupos: true } }),
  ]);

  const resultados: ResultadoBusquedaGlobal[] = [];

  for (const a of alumnos) {
    resultados.push({
      tipo: "alumno",
      id: a.id,
      titulo: a.nombre,
      subtitulo: a.curso,
      href: "/dashboard/mis-alumnos",
    });
  }

  for (const p of profesores) {
    resultados.push({
      tipo: "profesor",
      id: p.id,
      titulo: p.name ?? p.email,
      subtitulo: p.role,
      href: "/dashboard/usuarios",
    });
  }

  for (const e of empresas) {
    resultados.push({
      tipo: "empresa",
      id: e.id,
      titulo: e.nombreComercial,
      subtitulo: e.sector,
      href: `/dashboard/empresas/${e.id}`,
    });
  }

  const grupoTexto = texto.toLowerCase();
  const gruposCoincidentes = (school?.grupos ?? []).filter((g) => g.toLowerCase().includes(grupoTexto)).slice(0, 6);
  for (const g of gruposCoincidentes) {
    resultados.push({
      tipo: "grupo",
      id: g,
      titulo: g,
      subtitulo: "Grupo / ciclo",
      href: "/dashboard/mis-alumnos",
    });
  }

  return resultados;
}
