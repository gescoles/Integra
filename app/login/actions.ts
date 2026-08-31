"use server";

import { prisma } from "@/lib/prisma";

// Se llama ANTES de intentar entrar de verdad, para poder avisar al
// momento si ese correo está bloqueado temporalmente por demasiados
// intentos fallidos — sin que NextAuth enmascare el motivo real.
export async function comprobarBloqueoLogin(email: string) {
  const emailLimpio = email.trim().toLowerCase();
  if (!emailLimpio) return { bloqueado: false };

  const haceQuinceMinutos = new Date(Date.now() - 15 * 60 * 1000);
  const intentosRecientes = await prisma.intentoLoginFallido.count({
    where: { email: emailLimpio, createdAt: { gte: haceQuinceMinutos } },
  });

  return { bloqueado: intentosRecientes >= 5 };
}
