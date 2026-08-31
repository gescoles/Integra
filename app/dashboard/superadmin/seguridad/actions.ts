"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { generatePassword } from "@/lib/generatePassword";
import { sendPasswordEmail, sendInvitacionMicrosoftEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

function esSuperAdmin(role?: string) {
  return role === "SUPERADMIN";
}

// Todos los bloqueos, pendientes y resueltos — nunca se borran, quedan
// como constancia permanente de lo que ha pasado y quién lo resolvió.
export async function obtenerAccesosBloqueados() {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) return [];

  const bloqueos = await prisma.bloqueoAcceso.findMany({
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
  });

  const usuarios = await prisma.user.findMany({
    where: { email: { in: bloqueos.map((b) => b.email) } },
    select: { id: true, email: true, name: true, role: true, status: true, schoolId: true },
  });
  const usuarioPorEmail = new Map(usuarios.map((u) => [u.email, u]));

  return bloqueos.map((b) => ({
    id: b.id,
    email: b.email,
    cantidad: b.cantidadIntentos,
    ultimoIntento: b.ultimoIntento.toISOString(),
    estado: b.estado,
    resueltoPorNombre: b.resueltoPorNombre,
    accionResolucion: b.accionResolucion,
    resueltoEn: b.resueltoEn ? b.resueltoEn.toISOString() : null,
    usuario: usuarioPorEmail.get(b.email) ?? null,
  }));
}

// Cuántos bloqueos siguen PENDIENTES — para el aviso en la pantalla
// principal del SuperAdmin.
export async function contarAccesosBloqueadosActivos() {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) return 0;

  return prisma.bloqueoAcceso.count({ where: { estado: "PENDIENTE" } });
}

// Marca como RESUELTOS todos los bloqueos PENDIENTES de ese correo — se
// llama desde cualquier acción que "solucione" el problema (desbloquear,
// regenerar contraseña, reenviar invitación, activar/desactivar).
async function marcarBloqueosResueltos(email: string, accion: string, resueltoPorId: string | null, resueltoPorNombre: string) {
  await prisma.bloqueoAcceso.updateMany({
    where: { email, estado: "PENDIENTE" },
    data: {
      estado: "RESUELTO",
      resueltoPorId,
      resueltoPorNombre,
      accionResolucion: accion,
      resueltoEn: new Date(),
    },
  });
}

export async function desbloquearAccesoAhora(email: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede desbloquear accesos.");

  // Esto sí se borra: son los intentos "en caliente" que mantenían el
  // bloqueo activo — borrarlos permite volver a intentar entrar antes de
  // que pasen los 15 minutos. El registro del BloqueoAcceso en sí no se
  // toca, solo pasa a RESUELTO.
  await prisma.intentoLoginFallido.deleteMany({ where: { email } });

  await marcarBloqueosResueltos(
    email,
    "Desbloqueado manualmente",
    session?.user.id ?? null,
    session?.user.name ?? session?.user.email ?? "SuperAdmin"
  );

  revalidatePath("/dashboard/superadmin/seguridad");
}

export async function cambiarEstadoUsuarioDesdeSeguridad(userId: string, activar: boolean) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede hacer esto.");

  const usuario = await prisma.user.update({
    where: { id: userId },
    data: { status: activar ? "ACTIVO" : "INACTIVO" },
  });

  await prisma.userHistorial.create({
    data: {
      userId,
      accion: activar ? "Usuario activado" : "Usuario desactivado",
      detalle: "Desde la pantalla de Accesos bloqueados.",
      hechoPorId: session?.user.id ?? null,
      hechoPorNombre: session?.user.name ?? session?.user.email ?? "SuperAdmin",
    },
  });

  await marcarBloqueosResueltos(
    usuario.email,
    activar ? "Usuario activado" : "Usuario desactivado",
    session?.user.id ?? null,
    session?.user.name ?? session?.user.email ?? "SuperAdmin"
  );

  revalidatePath("/dashboard/superadmin/seguridad");
}

// Le regenera la contraseña (automática o la que escriba el SuperAdmin) y
// se la envía por correo, igual que desde la ficha de Usuarios — pensado
// para el caso típico: alguien ha olvidado su contraseña, ha fallado
// varias veces, y el SuperAdmin quiere resolverlo desde aquí mismo sin
// tener que ir a buscar al usuario en otra pantalla.
export async function regenerarPasswordDesdeSeguridad(userId: string, modo: "auto" | "manual", passwordManual?: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede hacer esto.");

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) throw new Error("No se ha encontrado el usuario.");

  const passwordNueva = modo === "auto" ? generatePassword(8) : (passwordManual ?? "").trim();
  if (modo === "manual" && passwordNueva.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const passwordHash = await bcrypt.hash(passwordNueva, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  try {
    await sendPasswordEmail(usuario.email, usuario.name ?? usuario.email, passwordNueva);
  } catch (e) {
    console.error("No se pudo enviar el correo con la contraseña nueva:", e);
  }

  // Igual que al desbloquearlo manualmente: si le acabamos de dar una
  // contraseña nueva, no tiene sentido dejarlo bloqueado esperando 15
  // minutos con la vieja.
  await prisma.intentoLoginFallido.deleteMany({ where: { email: usuario.email } });

  await prisma.userHistorial.create({
    data: {
      userId,
      accion: modo === "auto" ? "Contraseña generada automáticamente y enviada por correo" : "Contraseña manual escrita y enviada por correo",
      detalle: "Desde la pantalla de Accesos bloqueados.",
      hechoPorId: session?.user.id ?? null,
      hechoPorNombre: session?.user.name ?? session?.user.email ?? "SuperAdmin",
    },
  });

  await marcarBloqueosResueltos(
    usuario.email,
    modo === "auto" ? "Contraseña automática regenerada" : "Contraseña manual regenerada",
    session?.user.id ?? null,
    session?.user.name ?? session?.user.email ?? "SuperAdmin"
  );

  revalidatePath("/dashboard/superadmin/seguridad");
}

// La invitación a entrar con Microsoft/Teams no cambia ninguna
// contraseña — solo reenvía el correo de invitación, por si el usuario
// nunca lo vio o se le pasó, y por eso también desbloquea el acceso.
export async function reenviarInvitacionTeamsDesdeSeguridad(userId: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede hacer esto.");

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) throw new Error("No se ha encontrado el usuario.");

  await sendInvitacionMicrosoftEmail(usuario.email, usuario.name ?? usuario.email);
  await prisma.intentoLoginFallido.deleteMany({ where: { email: usuario.email } });

  await prisma.userHistorial.create({
    data: {
      userId,
      accion: "Invitación de Microsoft/Teams reenviada",
      detalle: "Desde la pantalla de Accesos bloqueados.",
      hechoPorId: session?.user.id ?? null,
      hechoPorNombre: session?.user.name ?? session?.user.email ?? "SuperAdmin",
    },
  });

  await marcarBloqueosResueltos(
    usuario.email,
    "Invitación de Teams reenviada",
    session?.user.id ?? null,
    session?.user.name ?? session?.user.email ?? "SuperAdmin"
  );

  revalidatePath("/dashboard/superadmin/seguridad");
}

// Historial de accesos correctos: quién ha entrado y cuándo, con el
// método usado. Se muestran los últimos 200 para no cargar de más.
export async function obtenerRegistroAccesos(filtroUserId?: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) return [];

  const registros = await prisma.registroAcceso.findMany({
    where: filtroUserId ? { userId: filtroUserId } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { role: true, schoolId: true, school: { select: { name: true } } } } },
  });

  return registros.map((r) => ({
    id: r.id,
    userId: r.userId,
    email: r.email,
    nombre: r.nombre,
    metodo: r.metodo,
    createdAt: r.createdAt.toISOString(),
    rol: r.user?.role ?? null,
    centro: r.user?.school?.name ?? null,
  }));
}
