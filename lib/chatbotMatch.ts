import { prisma } from "@/lib/prisma";

// Quita acentos y pasa a minúsculas, para que "cómo" y "como" coincidan igual.
function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .trim();
}

function tokenizar(texto: string) {
  return normalizar(texto)
    .split(/\s+/)
    .filter((palabra) => palabra.length > 2); // ignora "el", "de", "un"...
}

/**
 * Busca, entre todo lo que le has "enseñado" al chatbot, la respuesta que
 * mejor encaja con la pregunta del usuario. No usa ninguna IA externa: solo
 * cuenta cuántas palabras clave y palabras de la pregunta original coinciden.
 * Devuelve null si no encuentra nada suficientemente parecido.
 */
export async function buscarRespuesta(preguntaUsuario: string) {
  const entradas = await prisma.chatbotEntry.findMany();
  if (entradas.length === 0) return null;

  const palabrasUsuario = new Set(tokenizar(preguntaUsuario));
  if (palabrasUsuario.size === 0) return null;

  let mejor: { entrada: (typeof entradas)[number]; puntos: number } | null = null;

  for (const entrada of entradas) {
    let puntos = 0;

    // Las palabras clave puntúan más: son justo lo que el creador del
    // contenido ha marcado como importante para reconocer esa pregunta.
    for (const clave of entrada.palabrasClave) {
      const claveNormalizada = normalizar(clave);
      if (normalizar(preguntaUsuario).includes(claveNormalizada)) {
        puntos += 3;
      }
    }

    // Además, compara palabra por palabra con la pregunta "canónica"
    // guardada, para pillar coincidencias que no estén en las palabras clave.
    const palabrasPregunta = tokenizar(entrada.pregunta);
    for (const palabra of palabrasPregunta) {
      if (palabrasUsuario.has(palabra)) puntos += 1;
    }

    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) {
      mejor = { entrada, puntos };
    }
  }

  // Umbral mínimo para evitar respuestas random poco relacionadas.
  if (!mejor || mejor.puntos < 3) return null;

  return mejor.entrada;
}
