"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function buscarAlumnosGlobal(query: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const alumnos = await prisma.alumno.findMany({
    where: {
      schoolId: session.user.schoolId,
      OR: [{ nombre: { contains: q, mode: "insensitive" } }, { curso: { contains: q, mode: "insensitive" } }],
    },
    select: { id: true, nombre: true, curso: true, avatarUrl: true },
    orderBy: { nombre: "asc" },
    take: 8,
  });

  return alumnos;
}
