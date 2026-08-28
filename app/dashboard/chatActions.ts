"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EstadoPresencia } from "@prisma/client";

// Lista de CONVERSACIONES YA EXISTENTES (con quien ya ha habido al menos
// un mensaje) — no todos los usuarios del centro. Para empezar a hablar
// con alguien nuevo está la búsqueda aparte (buscarUsuariosSinChat).
export async function obtenerUsuariosParaChat() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) return [];

  const [usuarios, mensajes] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId, id: { not: session.user.id } },
      select: { id: true, name: true, email: true, avatarUrl: true, estadoPresencia: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.chatMensaje.findMany({
      where: {
        schoolId: session.user.schoolId,
        OR: [{ emisorId: session.user.id }, { receptorId: session.user.id }],
      },
      orderBy: { createdAt: "desc" },
      select: { emisorId: true, receptorId: true, texto: true, leido: true, createdAt: true },
    }),
  ]);

  return usuarios
    .map((u) => {
      const mensajesConEl = mensajes.filter((m) => m.emisorId === u.id || m.receptorId === u.id);
      const ultimo = mensajesConEl[0] ?? null;
      const noLeidos = mensajesConEl.filter((m) => m.emisorId === u.id && !m.leido).length;
      return {
        id: u.id,
        nombre: u.name ?? u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        estadoPresencia: u.estadoPresencia,
        ultimoMensaje: ultimo?.texto ?? null,
        ultimoMensajeFecha: ultimo?.createdAt.toISOString() ?? null,
        noLeidos,
      };
    })
    .filter((u) => u.ultimoMensajeFecha !== null)
    .sort((a, b) => (b.ultimoMensajeFecha as string).localeCompare(a.ultimoMensajeFecha as string));
}

// Búsqueda de gente NUEVA con quien todavía no hay conversación, para
// poder empezar a escribirle por primera vez.
export async function buscarUsuariosSinChat(query: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) return [];

  const q = query.trim();
  if (q.length < 1) return [];

  const usuarios = await prisma.user.findMany({
    where: {
      schoolId: session.user.schoolId,
      id: { not: session.user.id },
      name: { contains: q, mode: "insensitive" },
    },
    select: { id: true, name: true, email: true, avatarUrl: true, estadoPresencia: true },
    orderBy: { name: "asc" },
    take: 10,
  });

  return usuarios.map((u) => ({
    id: u.id,
    nombre: u.name ?? u.email,
    avatarUrl: u.avatarUrl,
    estadoPresencia: u.estadoPresencia,
  }));
}

// Para el desplegable de "notificaciones" del icono de arriba: solo la
// gente que me ha escrito y todavía tengo sin leer.
export async function obtenerNotificacionesChat() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) return [];

  const noLeidos = await prisma.chatMensaje.findMany({
    where: { receptorId: session.user.id, leido: false },
    orderBy: { createdAt: "desc" },
    include: { emisor: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  const porEmisor = new Map<string, { id: string; nombre: string; avatarUrl: string | null; texto: string; createdAt: string; cantidad: number }>();
  for (const m of noLeidos) {
    const existente = porEmisor.get(m.emisorId);
    if (existente) {
      existente.cantidad += 1;
    } else {
      porEmisor.set(m.emisorId, {
        id: m.emisor.id,
        nombre: m.emisor.name ?? m.emisor.email,
        avatarUrl: m.emisor.avatarUrl,
        texto: m.texto,
        createdAt: m.createdAt.toISOString(),
        cantidad: 1,
      });
    }
  }

  return Array.from(porEmisor.values());
}

export async function obtenerConversacion(otroUsuarioId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];

  const mensajes = await prisma.chatMensaje.findMany({
    where: {
      OR: [
        { emisorId: session.user.id, receptorId: otroUsuarioId },
        { emisorId: otroUsuarioId, receptorId: session.user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return mensajes.map((m) => ({
    id: m.id,
    texto: m.texto,
    esMio: m.emisorId === session.user.id,
    createdAt: m.createdAt.toISOString(),
    leido: m.leido,
  }));
}

export async function enviarMensajeChat(receptorId: string, texto: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const contenido = texto.trim();
  if (!contenido) throw new Error("Escribe algo antes de enviar.");
  if (contenido.length > 2000) throw new Error("El mensaje es demasiado largo.");

  const receptor = await prisma.user.findUnique({ where: { id: receptorId } });
  if (!receptor || receptor.schoolId !== session.user.schoolId) {
    throw new Error("No se puede enviar un mensaje a ese usuario.");
  }

  await prisma.chatMensaje.create({
    data: {
      schoolId: session.user.schoolId,
      emisorId: session.user.id,
      receptorId,
      texto: contenido,
    },
  });

  revalidatePath("/dashboard");
}

export async function marcarConversacionLeida(otroUsuarioId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return;

  await prisma.chatMensaje.updateMany({
    where: { emisorId: otroUsuarioId, receptorId: session.user.id, leido: false },
    data: { leido: true },
  });
}

export async function cambiarMiEstadoPresencia(estado: EstadoPresencia) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { estadoPresencia: estado },
  });
  revalidatePath("/dashboard");
}

// Usado por el polling: solo lo justo para actualizar el globo de avisos y
// el punto de estado propio, sin traer toda la lista de usuarios cada vez.
export async function obtenerResumenChat() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { totalNoLeidos: 0, miEstado: "DESCONECTADO" as EstadoPresencia };

  const [totalNoLeidos, yo] = await Promise.all([
    prisma.chatMensaje.count({ where: { receptorId: session.user.id, leido: false } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { estadoPresencia: true } }),
  ]);

  return { totalNoLeidos, miEstado: yo?.estadoPresencia ?? "DESCONECTADO" };
}
