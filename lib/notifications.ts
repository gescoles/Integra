import { prisma } from "@/lib/prisma";

export async function notifyUsers(
  userIds: string[],
  data: { schoolId: string; tipo: string; titulo: string; mensaje: string; link?: string }
) {
  if (userIds.length === 0) return;
  await prisma.notificacion.createMany({
    data: userIds.map((userId) => ({
      userId,
      schoolId: data.schoolId,
      tipo: data.tipo,
      titulo: data.titulo,
      mensaje: data.mensaje,
      link: data.link ?? null,
    })),
  });
}
