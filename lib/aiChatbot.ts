// Respuestas por IA para el chatbot, usando Groq (gratis, sin tarjeta, sin
// restricción de uso comercial en la UE — a diferencia del tier gratuito de
// Gemini, que Google prohíbe usar en producción para usuarios de la UE/EEE).
// Solo se llama a esto cuando ninguna de las respuestas "programadas" por
// el SuperAdmin encaja con la pregunta (ver lib/chatbotMatch.ts).
//
// Doqui tiene dos herramientas, ambas 100% gratis:
// 1. El tiempo real, vía Open-Meteo (gratis, sin clave).
// 2. Búsqueda general en internet, vía SearXNG (buscador de código abierto,
//    gratis, sin clave — agrega resultados de varios motores). NO usamos la
//    búsqueda web integrada de Groq ("browser_search") porque esa sí es de
//    pago por uso, ni Google/Brave porque ya no ofrecen nada gratis de
//    verdad en 2026.

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Mapa real de la interfaz (menú lateral y qué hay en cada pantalla), para
// que la IA pueda decir con precisión "dónde" está cada cosa en vez de
// inventarse nombres de botones o rutas que no existen.
const MAPA_APP = `
Estructura real del menú lateral de Docentium (lo que ve un profesor/coordinador, según lo que tenga contratado su centro):

- Inicio (/dashboard): resumen del día — próxima tutoría, próxima guardia, próxima clase, próximo evento, avisos del centro.
- Mis alumnos: alumnos asignados al profesor tutor.
- Tutorías: gestión de tutorías individuales con alumnos (crear, marcar como completada, ver seguimiento).
- Guardias: aquí un PROFESOR avisa de que va a faltar a una clase — hay un calendario donde se selecciona el día/hora exactos de la clase, y al elegirlo se abre un formulario para indicar el motivo y qué deben hacer los alumnos mientras tanto. Desde la misma pantalla también se ven "Mis coberturas" (guardias que ha cubierto o que le han cubierto a él). Dirección/Coordinación, desde esa misma pantalla, ve las "Solicitudes pendientes" y al pulsar en una puede elegir directamente qué profesor de guardia la cubre; también puede crear una guardia puntual con el botón "+ Nueva guardia", y editar o eliminar guardias ya asignadas desde la tabla "Guardias programadas".
- Material: catálogo de material didáctico/técnico del centro, con precios y justificación de uso.
- Salidas: organizar salidas y excursiones; dirección las aprueba o rechaza desde "Salidas → Aprobaciones".
- Prácticas: gestión de convenios y seguimiento de las prácticas de los alumnos (FCT).
- Expedientes: incidencias y expedientes disciplinarios de alumnos.
- Onboarding: documentación y checklist de incorporación de nuevos alumnos o profesores.
- Espacios: reserva de aulas y espacios comunes del centro.
- Calendario: vista de calendario general con eventos del centro.
- Mi horario: donde cada profesor rellena su propio horario semanal (clases y, si corresponde, sus horas de guardia).

Si preguntan cómo hacer algo que SÍ está en este mapa, indica la sección exacta del menú lateral donde está. Si preguntan por algo que no aparece aquí, no te lo inventes: di que no tienes esa información y que pregunten a dirección o al SuperAdmin del centro.
`.trim();

const SYSTEM_PROMPT = `Te llamas Doqui, el asistente de Docentium, una plataforma de gestión para centros educativos (tutorías, guardias, material, salidas, prácticas, expedientes, calendario...). Si te preguntan quién eres o cómo te llamas, responde que eres Doqui.

Los profesores pueden preguntarte lo que quieran, no solo sobre Docentium: dudas de la plataforma, ayuda para su trabajo docente (redactar textos, ideas para clase, dudas generales...) o cualquier otra cosa que les surja. Eres un asistente general, no un bot limitado a un solo tema.

Tienes dos herramientas:
1. Consultar el tiempo actual en cualquier población — úsala siempre que pregunten por el tiempo, la temperatura o el clima de un sitio.
2. Buscar en internet — úsala para cualquier cosa actual o que no sepas con seguridad: noticias, resultados deportivos, datos recientes, precios, hechos que no tengas claros, etc. No digas que no tienes acceso a esa información sin haber intentado buscarla primero.

${MAPA_APP}

Reglas importantes:
- Responde siempre en el mismo idioma en el que te escriben (español, catalán o inglés).
- Sé breve y directo: 2-4 frases como mucho, salvo que te pidan más detalle.
- Cuando te pregunten cómo hacer algo dentro de Docentium, usa los nombres EXACTOS de las secciones del menú tal como aparecen en el mapa de arriba, no te los inventes. Si preguntan por una función de Docentium que no aparece en el mapa, no te la inventes: di que no tienes esa información y que pregunten a dirección o al SuperAdmin del centro.
- NUNCA inventes datos concretos del centro del usuario: no sabes qué alumnos, horarios, guardias o expedientes reales tiene. Si preguntan algo así, indica amablemente que lo consulten dentro de la propia app o con dirección.
- Si buscas en internet y los resultados no traen una respuesta clara, dilo con naturalidad en vez de inventarte una respuesta.
- No des consejos legales, médicos ni financieros definitivos; para eso, remite a un profesional.`;

const WEATHER_TOOL = {
  type: "function",
  function: {
    name: "obtener_tiempo",
    description: "Obtiene la temperatura y las condiciones meteorológicas actuales de una ciudad o población concreta.",
    parameters: {
      type: "object",
      properties: {
        ciudad: {
          type: "string",
          description: "Nombre de la ciudad o población, por ejemplo 'Sabadell', 'Barcelona' o 'Madrid'.",
        },
      },
      required: ["ciudad"],
    },
  },
} as const;

const SEARCH_TOOL = {
  type: "function",
  function: {
    name: "buscar_en_internet",
    description:
      "Busca información actual en internet: noticias, resultados deportivos, datos recientes, precios, o cualquier hecho que no sepas con seguridad.",
    parameters: {
      type: "object",
      properties: {
        consulta: {
          type: "string",
          description: "Los términos de búsqueda, tal y como se escribirían en un buscador.",
        },
      },
      required: ["consulta"],
    },
  },
} as const;

const DESCRIPCIONES_TIEMPO: Record<number, string> = {
  0: "cielo despejado",
  1: "mayormente despejado",
  2: "parcialmente nublado",
  3: "nublado",
  45: "niebla",
  48: "niebla con escarcha",
  51: "llovizna ligera",
  53: "llovizna moderada",
  55: "llovizna intensa",
  56: "llovizna helada",
  57: "llovizna helada intensa",
  61: "lluvia ligera",
  63: "lluvia moderada",
  65: "lluvia intensa",
  66: "lluvia helada",
  67: "lluvia helada intensa",
  71: "nevada ligera",
  73: "nevada moderada",
  75: "nevada intensa",
  77: "granos de nieve",
  80: "chubascos ligeros",
  81: "chubascos moderados",
  82: "chubascos intensos",
  85: "chubascos de nieve ligeros",
  86: "chubascos de nieve intensos",
  95: "tormenta",
  96: "tormenta con granizo ligero",
  99: "tormenta con granizo intenso",
};

// Consulta el tiempo real en una población, usando Open-Meteo (gratis, sin
// necesidad de API key). Primero geocodifica el nombre a coordenadas y
// luego pide el tiempo actual en esas coordenadas.
async function obtenerTiempo(ciudad: string): Promise<string> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`,
      { signal: AbortSignal.timeout(6000) }
    );
    const geoData = await geoRes.json();
    const lugar = geoData?.results?.[0];
    if (!lugar) {
      return JSON.stringify({ error: `No he encontrado ninguna población llamada "${ciudad}".` });
    }

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lugar.latitude}&longitude=${lugar.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`,
      { signal: AbortSignal.timeout(6000) }
    );
    const forecastData = await forecastRes.json();
    const actual = forecastData?.current;
    if (!actual) {
      return JSON.stringify({ error: "No se ha podido consultar el tiempo ahora mismo." });
    }

    return JSON.stringify({
      lugar: [lugar.name, lugar.admin1, lugar.country].filter(Boolean).join(", "),
      temperatura_celsius: actual.temperature_2m,
      descripcion: DESCRIPCIONES_TIEMPO[actual.weather_code] ?? "condiciones variables",
      viento_kmh: actual.wind_speed_10m,
      humedad_relativa_pct: actual.relative_humidity_2m,
    });
  } catch {
    return JSON.stringify({ error: "No se ha podido consultar el tiempo ahora mismo." });
  }
}

// Instancias públicas de SearXNG (buscador de código abierto, gratis, sin
// clave). Como cualquier instancia pública puede caerse o desactivar el
// formato JSON en cualquier momento, se prueban varias por orden y se usa
// la primera que responda. Si en el futuro todas fallan a la vez, conviene
// revisar https://searx.space y sustituir esta lista por instancias vivas.
const SEARXNG_INSTANCES = [
  "https://searx.be",
  "https://priv.au",
  "https://search.inetol.net",
  "https://opnxng.com",
];

async function buscarEnInternet(consulta: string): Promise<string> {
  for (const base of SEARXNG_INSTANCES) {
    try {
      const res = await fetch(
        `${base}/search?q=${encodeURIComponent(consulta)}&format=json&language=es`,
        {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "Mozilla/5.0 (compatible; DocentiumDoqui/1.0)" },
        }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const resultados = (data?.results ?? [])
        .slice(0, 5)
        .map((r: { title?: string; content?: string; url?: string }) => ({
          titulo: r.title,
          resumen: r.content,
          url: r.url,
        }));

      if (resultados.length === 0) continue;
      return JSON.stringify({ resultados });
    } catch {
      // Esta instancia ha fallado (caída, JSON desactivado, timeout...):
      // probamos con la siguiente de la lista.
      continue;
    }
  }
  return JSON.stringify({ error: "No se ha podido buscar en internet ahora mismo." });
}

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

async function llamarGroq(apiKey: string, messages: GroqMessage[], conHerramientas: boolean) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 400,
      ...(conHerramientas ? { tools: [WEATHER_TOOL, SEARCH_TOOL], tool_choice: "auto" } : {}),
    }),
    // Si Groq tarda demasiado, mejor fallar rápido y caer al mensaje de
    // siempre que esperar indefinidamente con el chat colgado.
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null;
  return res.json();
}

async function ejecutarHerramienta(nombre: string, argumentosJson: string): Promise<string> {
  let args: Record<string, string> = {};
  try {
    args = JSON.parse(argumentosJson || "{}");
  } catch {
    // Si el JSON viene mal formado, seguimos con args vacío; cada
    // herramienta devuelve su propio error controlado si le falta el dato.
  }

  if (nombre === "obtener_tiempo") return obtenerTiempo(args.ciudad ?? "");
  if (nombre === "buscar_en_internet") return buscarEnInternet(args.consulta ?? "");
  return JSON.stringify({ error: "Herramienta desconocida." });
}

export async function preguntarIA(pregunta: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const baseMessages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: pregunta.slice(0, 1000) },
  ];

  try {
    const primera = await llamarGroq(apiKey, baseMessages, true);
    const mensaje = primera?.choices?.[0]?.message;
    if (!mensaje) return null;

    const toolCalls = mensaje.tool_calls as GroqMessage["tool_calls"];

    // El modelo ha pedido usar una o más herramientas: las ejecutamos de
    // verdad y le devolvemos el resultado para que redacte la respuesta final.
    if (toolCalls && toolCalls.length > 0) {
      const toolMessages: GroqMessage[] = [];

      for (const call of toolCalls) {
        const resultado = await ejecutarHerramienta(call.function?.name, call.function?.arguments);
        toolMessages.push({ role: "tool", tool_call_id: call.id, content: resultado });
      }

      const segunda = await llamarGroq(
        apiKey,
        [...baseMessages, { role: "assistant", content: mensaje.content ?? null, tool_calls: toolCalls }, ...toolMessages],
        false
      );
      const textoFinal = segunda?.choices?.[0]?.message?.content;
      return typeof textoFinal === "string" && textoFinal.trim() ? textoFinal.trim() : null;
    }

    const texto = mensaje.content;
    return typeof texto === "string" && texto.trim() ? texto.trim() : null;
  } catch {
    return null;
  }
}
