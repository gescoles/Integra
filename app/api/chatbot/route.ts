import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buscarRespuesta } from "@/lib/chatbotMatch";
import { preguntarIA } from "@/lib/aiChatbot";

const RESPUESTA_FALLBACK =
  "No tengo una respuesta guardada para eso todavía, y ahora mismo tampoco puedo consultar a la IA. Prueba a preguntar de otra forma, o pídele al administrador que la añada — tu pregunta ha quedado registrada para que la revise.";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
  }

  const ultimaPregunta = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const encontrada = await buscarRespuesta(ultimaPregunta);

  if (encontrada) {
    return NextResponse.json({ text: encontrada.respuesta, esIA: false });
  }

  // Guardamos la pregunta sin responder para que el administrador la vea y
  // pueda "enseñarle" la respuesta al chatbot desde la pantalla de gestión,
  // aunque la IA ya le haya podido contestar al profesor en el momento.
  try {
    await prisma.chatbotPreguntaSinResponder.create({
      data: { texto: ultimaPregunta.slice(0, 500) },
    });
  } catch {
    // Si esto falla, no pasa nada grave: simplemente no queda registrada.
  }

  // Nada programado encaja: dejamos que responda la IA en su lugar. Si
  // Groq no está configurado o falla, caemos al mensaje de siempre.
  const respuestaIA = await preguntarIA(ultimaPregunta);
  if (respuestaIA) {
    return NextResponse.json({ text: respuestaIA, esIA: true });
  }

  return NextResponse.json({ text: RESPUESTA_FALLBACK, esIA: false });
}
