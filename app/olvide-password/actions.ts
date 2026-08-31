"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendPasswordResetCodeEmail } from "@/lib/email";

function generarCodigo6Digitos() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Paso 1: el usuario mete su email. Por seguridad, la respuesta es
// siempre la misma diga lo que diga (exista o no ese email) — así nadie
// puede usar este formulario para averiguar qué correos están
// registrados en el sistema probando direcciones al azar.
//
// Excepción a propósito: si el login con contraseña está bloqueado a
// nivel de plataforma (el interruptor del SuperAdmin), recuperar la
// contraseña tampoco sirve de nada — así que aquí sí se avisa con un
// mensaje claro, en vez de fingir que se ha enviado un código que luego
// no dejaría entrar a nadie.
export async function solicitarCodigoReset(email: string) {
  const emailLimpio = email.trim().toLowerCase();
  if (!emailLimpio) throw new Error("Escribe tu correo electrónico.");

  const config = await prisma.configuracion.findUnique({ where: { id: "global" } });
  const user = await prisma.user.findUnique({ where: { email: emailLimpio } });
  if (!config?.loginPasswordHabilitado && user?.role !== "SUPERADMIN") {
    throw new Error("Recuperación de contraseña no disponible para tu centro. Contacta con el administrador de la plataforma.");
  }

  if (user) {
    const codigo = generarCodigo6Digitos();
    const expiraEn = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.passwordResetCode.create({
      data: { email: emailLimpio, codigo, expiraEn },
    });
    try {
      await sendPasswordResetCodeEmail(user.email, user.name ?? user.email, codigo);
    } catch (e) {
      console.error("No se pudo enviar el correo del código de recuperación:", e);
    }
  }

  return { ok: true };
}

// Paso 2: comprobar que el código es correcto y no ha caducado, sin
// gastarlo todavía (se gasta de verdad en el paso 3, al cambiar la
// contraseña) — así, si el usuario recarga la página a mitad, no pierde
// el código ya validado.
export async function verificarCodigoReset(email: string, codigo: string) {
  const emailLimpio = email.trim().toLowerCase();
  const registro = await prisma.passwordResetCode.findFirst({
    where: { email: emailLimpio, codigo: codigo.trim(), usado: false },
    orderBy: { createdAt: "desc" },
  });

  if (!registro || registro.expiraEn < new Date()) {
    throw new Error("El código no es correcto o ha caducado. Pide uno nuevo.");
  }

  return { ok: true };
}

// Paso 3: vuelve a comprobar el código (por si alguien intentara saltarse
// el paso 2 llamando directamente a esta función) y, si es válido, cambia
// la contraseña de verdad y marca el código como usado para que no se
// pueda reutilizar.
export async function restablecerPassword(email: string, codigo: string, nuevaPassword: string) {
  const emailLimpio = email.trim().toLowerCase();
  if (!nuevaPassword || nuevaPassword.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const config = await prisma.configuracion.findUnique({ where: { id: "global" } });
  const user = await prisma.user.findUnique({ where: { email: emailLimpio } });
  if (!config?.loginPasswordHabilitado && user?.role !== "SUPERADMIN") {
    throw new Error("Recuperación de contraseña no disponible para tu centro. Contacta con el administrador de la plataforma.");
  }
  if (!user) throw new Error("No se ha encontrado ningún usuario con ese correo.");

  const registro = await prisma.passwordResetCode.findFirst({
    where: { email: emailLimpio, codigo: codigo.trim(), usado: false },
    orderBy: { createdAt: "desc" },
  });
  if (!registro || registro.expiraEn < new Date()) {
    throw new Error("El código no es correcto o ha caducado. Pide uno nuevo.");
  }

  const passwordHash = await bcrypt.hash(nuevaPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordResetCode.update({ where: { id: registro.id }, data: { usado: true } }),
  ]);

  return { ok: true };
}
