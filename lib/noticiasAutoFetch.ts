// Refresco diario y automático de /noticias (la landing pública), pensado
// para llamarse desde un cron de Vercel una vez al día (ver
// app/api/cron/noticias-educacion/route.ts). Publica hasta 10 noticias
// nuevas cada día, repartidas en 5 bloques:
//   - Educación en España (hasta 3)
//   - Educación en Cataluña (hasta 1)
//   - Ciencia (hasta 2)
//   - Inteligencia artificial (hasta 2)
//   - Buenas noticias / cosas positivas que han pasado en el mundo (hasta 2)
//
// Cómo funciona, en dos pasos, sin depender de ninguna API de pago:
// 1. Lee los RSS reales de medios especializados en cada tema (RSS es
//    justo para esto: estable y pensado para consumo automático — a
//    diferencia de un buscador de terceros tipo SearXNG, que puede
//    bloquear o limitar peticiones automáticas sin previo aviso).
// 2. Con lo encontrado (solo título + resumen + url de la fuente, nunca el
//    artículo completo), le pide a Groq (gratis, ya configurado para el
//    chatbot) que redacte una explicación ORIGINAL en español — nunca una
//    copia literal — y siempre citando la fuente.
//
// Las imágenes son ilustraciones propias de stock (Pexels, uso libre),
// nunca la foto original de la fuente, para no depender de su copyright
// ni de que su imagen exista.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// RSS de medios especializados en educación, con cobertura de toda
// España (pública, concertada y privada).
const FEEDS_ESPANA = ["https://eldiariodelaeducacion.com/feed/", "https://www.magisnet.com/feed/"];

// RSS generalista en catalán — no es un feed exclusivo de educación, así
// que sus noticias se filtran después por palabras clave del sector
// (ver CLAVES_EDUCACIO_CA). Sirve también como segunda fuente para
// detectar noticias de Cataluña dentro de los feeds de España de arriba.
const FEED_CATALUNYA = "https://www.naciodigital.cat/rss/tema/12";

// Divulgación científica en español, medios generalistas de referencia.
const FEEDS_CIENCIA = ["https://www.elmundo.es/rss/ciencia.xml", "https://www.abc.es/rss/feeds/abc_Ciencia.xml"];

// Actualidad de inteligencia artificial en español, separada de la
// ciencia general porque tiene entidad e interés propios.
const FEEDS_IA = ["https://www.xataka.com/tag/inteligencia-artificial/rss2.xml", "https://www.genbeta.com/tag/inteligencia-artificial/rss2.xml"];

// "Solutions journalism" / good news — Ballena Blanca ya es en español;
// Good News Network es en inglés, pero Groq lo traduce y redacta en
// español igualmente al procesarlo.
const FEEDS_BUENAS = ["https://ballenablanca.es/feed/", "https://www.goodnewsnetwork.org/feed/"];

const CLAVES_CATALUNYA = ["catalunya", "cataluña", "catalana", "catalán", "barcelona", "generalitat", "girona", "tarragona", "lleida"];
const CLAVES_EDUCACIO_CA = ["educaci", "escola", "escoles", "institut", "instituts", "universitat", "alumn", "professor", "mestre", "batxillerat", "formació professional", "ensenyament"];

type ItemRSS = { titulo: string; resumen: string; url: string; pubDate: Date | null; categorias: string[] };

function extraerTag(bloque: string, tag: string): string {
  const m = bloque.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1] : "";
}

function limpiarTexto(texto: string): string {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function leerFeed(url: string): Promise<ItemRSS[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DocentiumNoticias/1.0)" },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const bloques = xml.split(/<item[\s>]/i).slice(1);

    return bloques
      .map((bloque): ItemRSS | null => {
        const titulo = limpiarTexto(extraerTag(bloque, "title"));
        const link = limpiarTexto(extraerTag(bloque, "link"));
        const descripcion = limpiarTexto(extraerTag(bloque, "description")).slice(0, 600);
        const pubDateRaw = extraerTag(bloque, "pubDate");
        const categorias = Array.from(bloque.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)).map((m) => limpiarTexto(m[1]).toLowerCase());

        if (!titulo || !link.startsWith("http") || descripcion.length < 30) return null;

        return { titulo, resumen: descripcion, url: link, pubDate: pubDateRaw ? new Date(pubDateRaw) : null, categorias };
      })
      .filter((x): x is ItemRSS => x !== null);
  } catch {
    return [];
  }
}

async function leerFeeds(urls: string[]): Promise<ItemRSS[]> {
  const listas = await Promise.all(urls.map(leerFeed));
  return listas.flat();
}

// Grupos de imágenes de stock por tema educativo — solo se usan para las
// noticias de educación (España/Cataluña); Ciencia y Buenas noticias
// llevan cada una su propia imagen fija (ver TEMAS más abajo), porque
// estas palabras clave son específicas del sector educativo y darían
// falsos positivos en otros temas.
// Hash simple y determinista (mismo texto de entrada -> mismo número
// siempre) — se usa para elegir SIEMPRE la misma foto para un artículo
// concreto si algún día se reprocesara, pero repartir la elección entre
// varias fotos del grupo para que dos noticias del mismo tema no
// enseñen la misma imagen.
function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function fotoPexels(id: string) {
  return {
    portada: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`,
    inline: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1000`,
  };
}

type GrupoImagen = { claves: string[]; fotos: string[] };

const GRUPOS_IMAGEN_EDUCACION: GrupoImagen[] = [
  {
    claves: ["fp", "formación profesional", "formació professional", "ciclo formativo", "grado medio", "grado superior", "dual"],
    fotos: ["3855478", "8443078", "8531359"],
  },
  {
    claves: ["pau", "selectividad", "ebau", "acceso a la universidad", "nota de corte"],
    fotos: ["6684150", "37812750", "9489910"],
  },
  {
    claves: ["universidad", "universitat", "campus", "grado universitario", "máster", "doctorado"],
    fotos: ["16420457", "9572509", "8500648"],
  },
  {
    claves: ["calendario escolar", "curso escolar", "vuelta al cole", "inicio de curso", "vacaciones"],
    fotos: ["12932566", "8500353"],
  },
  {
    claves: ["inteligencia artificial", " ia ", "digital", "tecnológ", "tecnolog", "ordenador", "informática"],
    fotos: ["8423123", "8439069", "1181398"],
  },
  {
    claves: ["infantil", "primaria", "guardería", "niños pequeños", "0-3"],
    fotos: ["8535165", "8422135", "8535198"],
  },
  {
    claves: ["huelga", "sindicat", "protesta", "manifestaci", "concentraci", "paro docente"],
    fotos: ["5940836", "9572395"],
  },
  {
    claves: ["decreto", "ley", "ministerio", "consejería", "conselleria", "gobierno", "generalitat", "administraci", "normativa", "boe"],
    fotos: ["6791897", "34475611"],
  },
  {
    claves: ["financiación", "fondos", "presupuesto", "inversión", "europea", "europeos", "subvención", "beca", "becas"],
    fotos: ["6791897", "3115407"],
  },
  {
    claves: ["profesorado", "docente", "docentes", "maestro", "maestros", "claustro", "profesores"],
    fotos: ["8423062", "7156144", "6503100"],
  },
  {
    claves: ["biblioteca", "lectura", "libro", "libros"],
    fotos: ["9572509", "16420457"],
  },
];

const FOTOS_GENERICAS = ["8423018", "8423062", "17565045", "8500648", "16420457", "8419626", "9489910"];
const FOTOS_CIENCIA = ["3735711", "8443078"];
const FOTOS_IA = ["8423123", "8439069", "1181398"];
const FOTOS_BUENAS = ["7156175", "6647015"];

function elegirImagenEducacion(texto: string, semilla: string) {
  const t = texto.toLowerCase();
  for (const grupo of GRUPOS_IMAGEN_EDUCACION) {
    if (grupo.claves.some((c) => t.includes(c))) {
      return fotoPexels(grupo.fotos[hash(semilla) % grupo.fotos.length]);
    }
  }
  return fotoPexels(FOTOS_GENERICAS[hash(semilla) % FOTOS_GENERICAS.length]);
}

function elegirImagenFija(pool: string[], semilla: string) {
  return fotoPexels(pool[hash(semilla) % pool.length]);
}

function slugify(titulo: string, sufijo: string) {
  const base = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base}-${sufijo}`;
}

type Redaccion = { titulo: string; resumen: string; parrafo1: string; parrafo2: string; parrafo3: string };

async function redactar(fuente: ItemRSS, ambito: string, instruccionesTema: string): Promise<Redaccion | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `Eres redactor/a del portal de noticias de Docentium. Te paso el título y un breve resumen de una noticia real (ámbito: ${ambito}), encontrada en: ${fuente.url}

Título original: "${fuente.titulo}"
Resumen encontrado: "${fuente.resumen}"

${instruccionesTema}

Redacta EN ESPAÑOL (aunque el original esté en otro idioma) un artículo ORIGINAL a partir de esta información — nunca copies frases literales del resumen, escribe con tus propias palabras. No inventes datos, cifras ni fechas que no estén en el resumen — si falta algún detalle, no lo completes de tu cosecha.

Devuelve ÚNICAMENTE un JSON válido, sin texto antes ni después, con estas claves exactas:
{"titulo": "titular claro y conciso, distinto del original", "resumen": "1-2 frases resumen para portada", "parrafo1": "primer párrafo de contexto", "parrafo2": "segundo párrafo con el desarrollo", "parrafo3": "tercer párrafo de cierre"}`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 900,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const texto: string | undefined = data?.choices?.[0]?.message?.content;
    if (!texto) return null;

    // El modelo a veces envuelve el JSON en ```json ... ``` pese a que se
    // le pide que no lo haga — se limpia por si acaso antes de parsear.
    const limpio = texto.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(limpio);
    if (!parsed.titulo || !parsed.resumen || !parsed.parrafo1 || !parsed.parrafo2 || !parsed.parrafo3) return null;

    return parsed as Redaccion;
  } catch {
    return null;
  }
}

// No se publican noticias de fuentes más antiguas que esto — evita
// "resucitar" artículos viejos si un feed no trae nada realmente reciente.
const MAX_DIAS_ANTIGUEDAD_FUENTE = 5;

function esReciente(item: ItemRSS): boolean {
  if (!item.pubDate || isNaN(item.pubDate.getTime())) return true; // sin fecha: no se descarta por esto
  return Date.now() - item.pubDate.getTime() < MAX_DIAS_ANTIGUEDAD_FUENTE * 24 * 60 * 60 * 1000;
}

function esOpinion(item: ItemRSS): boolean {
  return item.categorias.some((c) => c.includes("opini"));
}

type Bloque = {
  clave: string; // usado en el slug: "esp" | "cat" | "cie" | "bue"
  categoria: Prisma.NoticiaCreateInput["categoria"];
  ambito: string; // se le explica a la IA para qué está redactando
  instruccionesTema: string;
  max: number;
  etiquetaFuentePorDefecto: string;
  imagenPorPalabraClave: boolean; // true solo para educación
  poolImagenes?: string[]; // ids de Pexels, para los bloques sin palabras clave propias
};

async function publicarBloque(bloque: Bloque, candidatas: ItemRSS[]) {
  const publicadas: string[] = [];

  for (const candidata of candidatas) {
    if (publicadas.length >= bloque.max) break;

    // Si ya existe una noticia con esta misma URL de fuente, no se
    // vuelve a publicar (evita duplicar la misma historia cada día).
    const yaExiste = await prisma.noticia.findFirst({ where: { fuenteUrl: candidata.url }, select: { id: true } });
    if (yaExiste) continue;

    const redaccion = await redactar(candidata, bloque.ambito, bloque.instruccionesTema);
    if (!redaccion) continue;

    // El "-auto-<clave>-" en el sufijo del slug marca esta noticia como
    // generada automáticamente (a diferencia de las escritas a mano
    // desde el panel o el script de seed) — es lo que usa
    // limpiarNoticiasAntiguas() para saber cuáles puede borrar pasados
    // los MAX_DIAS_RETENCION días, sin tocar nunca las demás. También
    // sirve de semilla para elegir imagen: al llevar la marca de tiempo
    // en milisegundos, dos artículos casi nunca comparten semilla, ni
    // siquiera si vienen de URLs con el mismo prefijo (a diferencia de
    // usar la URL de la fuente como semilla, que sí podía coincidir).
    const slug = slugify(redaccion.titulo, `auto-${bloque.clave}-${Date.now()}`);

    const imagenes = bloque.imagenPorPalabraClave
      ? elegirImagenEducacion(`${candidata.titulo} ${redaccion.titulo} ${redaccion.resumen}`, slug)
      : elegirImagenFija(bloque.poolImagenes!, slug);

    const cuerpoHtml = [
      `<p>${redaccion.parrafo1}</p>`,
      `<p>${redaccion.parrafo2}</p>`,
      `<img src="${imagenes.inline}" alt="" />`,
      `<p>${redaccion.parrafo3}</p>`,
    ].join("\n");

    // Intenta sacar un nombre de medio legible de la URL de la fuente
    // (p.ej. "elmundo.es") solo como último recurso — si no se puede,
    // usa una etiqueta genérica por bloque.
    let fuenteNombre = bloque.etiquetaFuentePorDefecto;
    try {
      fuenteNombre = new URL(candidata.url).hostname.replace(/^www\./, "");
    } catch {
      // se queda con la etiqueta por defecto
    }

    await prisma.noticia.create({
      data: {
        categoria: bloque.categoria,
        schoolId: null,
        slug,
        titulo: redaccion.titulo,
        resumen: redaccion.resumen,
        imagenPortada: imagenes.portada,
        modo: "SIMPLE",
        cuerpoHtml,
        fuenteNombre,
        fuenteUrl: candidata.url,
        publicada: true,
        publishedAt: new Date(),
      },
    });

    publicadas.push(redaccion.titulo);
  }

  return publicadas;
}

// Cuántos días se conserva una noticia auto-generada antes de borrarse —
// así el número de filas no crece sin límite ni la portada de /noticias
// se queda llena de artículos de hace meses. Las noticias escritas a
// mano (el seed, o desde el panel de SuperAdmin) NUNCA se tocan aquí:
// solo se borran las que llevan la marca "-auto-<clave>-" en el slug.
const MAX_DIAS_RETENCION = 30;

async function limpiarNoticiasAntiguas(): Promise<number> {
  const limite = new Date(Date.now() - MAX_DIAS_RETENCION * 24 * 60 * 60 * 1000);

  const { count } = await prisma.noticia.deleteMany({
    where: {
      createdAt: { lt: limite },
      OR: [
        { slug: { contains: "-auto-esp-" } },
        { slug: { contains: "-auto-cat-" } },
        { slug: { contains: "-auto-cie-" } },
        { slug: { contains: "-auto-ia-" } },
        { slug: { contains: "-auto-bue-" } },
      ],
    },
  });

  return count;
}

/**
 * Se llama desde el cron diario: lee los RSS de educación (España y
 * Cataluña), ciencia y "buenas noticias", y publica hasta 5 noticias
 * nuevas en total con una explicación propia e imagen de ilustración —
 * de paso borra las noticias auto-generadas de hace más de 30 días para
 * que esto no crezca sin límite. Nunca toca las noticias de centros ni
 * las escritas a mano desde el panel.
 */
export async function refrescarNoticiasEducacion() {
  const [itemsEspana, itemsCatalunyaGeneral, itemsCiencia, itemsIA, itemsBuenas] = await Promise.all([
    leerFeeds(FEEDS_ESPANA),
    leerFeed(FEED_CATALUNYA),
    leerFeeds(FEEDS_CIENCIA),
    leerFeeds(FEEDS_IA),
    leerFeeds(FEEDS_BUENAS),
  ]);

  const dedupeFabrica = () => {
    const vistos = new Set<string>();
    return (items: ItemRSS[]) => items.filter((it) => (vistos.has(it.url) ? false : (vistos.add(it.url), true)));
  };

  const esDeCatalunya = (it: ItemRSS) => {
    const t = `${it.titulo} ${it.resumen}`.toLowerCase();
    return CLAVES_CATALUNYA.some((c) => t.includes(c));
  };
  const esEducativoCatalan = (it: ItemRSS) => {
    const t = `${it.titulo} ${it.resumen}`.toLowerCase();
    return CLAVES_EDUCACIO_CA.some((c) => t.includes(c));
  };

  const educacionBase = itemsEspana.filter((it) => esReciente(it) && !esOpinion(it));
  const dedupeEspana = dedupeFabrica();
  const dedupeCataluna = dedupeFabrica();
  const dedupeCiencia = dedupeFabrica();
  const dedupeIA = dedupeFabrica();
  const dedupeBuenas = dedupeFabrica();

  const ordenarPorFecha = (items: ItemRSS[]) => [...items].sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));

  const candidatasEspana = ordenarPorFecha(dedupeEspana(educacionBase.filter((it) => !esDeCatalunya(it))));
  const candidatasCataluna = ordenarPorFecha(
    dedupeCataluna([
      ...educacionBase.filter((it) => esDeCatalunya(it)),
      ...itemsCatalunyaGeneral.filter((it) => esReciente(it) && !esOpinion(it) && esEducativoCatalan(it)),
    ])
  );
  const candidatasCiencia = ordenarPorFecha(dedupeCiencia(itemsCiencia.filter((it) => esReciente(it) && !esOpinion(it))));
  const candidatasIA = ordenarPorFecha(dedupeIA(itemsIA.filter((it) => esReciente(it) && !esOpinion(it))));
  const candidatasBuenas = ordenarPorFecha(dedupeBuenas(itemsBuenas.filter((it) => esReciente(it) && !esOpinion(it))));

  const [espana, cataluna, ciencia, ia, buenas] = await Promise.all([
    publicarBloque(
      {
        clave: "esp",
        categoria: "EDUCACION_ESPANA",
        ambito: "actualidad educativa en España",
        instruccionesTema:
          "Va dirigida a equipos directivos y docentes de centros educativos de TODAS las titularidades (públicos, concertados y privados) — si el tema afecta de forma distinta a algún tipo de centro, acláralo; si no, no lo fuerces. Tono periodístico neutro y claro.",
        max: 3,
        etiquetaFuentePorDefecto: "Educación en España",
        imagenPorPalabraClave: true,
      },
      candidatasEspana
    ),
    publicarBloque(
      {
        clave: "cat",
        categoria: "EDUCACION_ESPANA",
        ambito: "actualidad educativa en Cataluña",
        instruccionesTema:
          "Va dirigida a equipos directivos y docentes de centros educativos de TODAS las titularidades (públicos, concertados y privados) de Cataluña — si el tema afecta de forma distinta a algún tipo de centro, acláralo; si no, no lo fuerces. Tono periodístico neutro y claro.",
        max: 1,
        etiquetaFuentePorDefecto: "Educació a Catalunya",
        imagenPorPalabraClave: true,
      },
      candidatasCataluna
    ),
    publicarBloque(
      {
        clave: "cie",
        categoria: "CIENCIA",
        ambito: "divulgación científica",
        instruccionesTema:
          "Es un artículo de divulgación científica para público general (no especialistas): claro, ameno y sin tecnicismos innecesarios — si usas algún término técnico, explícalo brevemente entre comas.",
        max: 2,
        etiquetaFuentePorDefecto: "Ciencia",
        imagenPorPalabraClave: false,
        poolImagenes: FOTOS_CIENCIA,
      },
      candidatasCiencia
    ),
    publicarBloque(
      {
        clave: "ia",
        categoria: "IA",
        ambito: "actualidad de inteligencia artificial",
        instruccionesTema:
          "Es un artículo sobre inteligencia artificial para público general (no especialistas): claro y ameno, sin tecnicismos innecesarios — si usas algún término técnico, explícalo brevemente entre comas.",
        max: 2,
        etiquetaFuentePorDefecto: "Inteligencia artificial",
        imagenPorPalabraClave: false,
        poolImagenes: FOTOS_IA,
      },
      candidatasIA
    ),
    publicarBloque(
      {
        clave: "bue",
        categoria: "BUENAS_NOTICIAS",
        ambito: "una noticia positiva de actualidad en el mundo",
        instruccionesTema:
          "Es una \"buena noticia\": algo positivo que ha pasado de verdad en algún lugar del mundo. Tono cercano y esperanzador, sin caer en sensacionalismo ni exagerar lo ocurrido.",
        max: 2,
        etiquetaFuentePorDefecto: "Buenas noticias",
        imagenPorPalabraClave: false,
        poolImagenes: FOTOS_BUENAS,
      },
      candidatasBuenas
    ),
  ]);

  const borradas = await limpiarNoticiasAntiguas();

  return {
    espana,
    cataluna,
    ciencia,
    ia,
    buenas,
    total: espana.length + cataluna.length + ciencia.length + ia.length + buenas.length,
    borradas,
  };
}
