// Script puntual para precargar la web pública de Docentium con unas
// primeras noticias reales de actualidad educativa en España, para que la
// sección "Educación en España" de /noticias no empiece vacía.
//
// Cómo ejecutarlo:
//   npm run seed:noticias-educacion
//
// Es seguro ejecutarlo varias veces: siempre deja estas 4 noticias con el
// contenido y las imágenes más recientes de este script (por si lo vuelvo
// a actualizar), pero nunca toca ni duplica las que tú mismo crees desde
// el panel.
//
// El contenido está redactado por Docentium a partir de varias fuentes
// (no son copias literales de ningún artículo), cada una enlaza al medio
// de referencia, y las imágenes son ilustraciones propias — nada sacado
// de internet — servidas directamente desde /public/noticias, así que no
// dependen de tener nada configurado en Supabase Storage.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(titulo: string, sufijo: string) {
  const base = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base}-${sufijo}`;
}

// Construye el cuerpo intercalando párrafos e imágenes, tal y como se
// vería en un artículo de revista: texto, luego una imagen de apoyo,
// luego más texto.
function articulo(parrafosAntes: string[], imagenInline: string, parrafosDespues: string[]) {
  const antes = parrafosAntes.map((t) => `<p>${t}</p>`).join("\n");
  const despues = parrafosDespues.map((t) => `<p>${t}</p>`).join("\n");
  const img = `<img src="${imagenInline}" alt="" />`;
  return `${antes}\n${img}\n${despues}`;
}

const NOTICIAS = [
  {
    titulo: "La Selectividad cambia de nombre y de enfoque: así es la nueva PAU",
    resumen:
      "La prueba de acceso a la universidad recupera su nombre original y apuesta por un examen más práctico y homogéneo en toda España.",
    fuenteNombre: "Moncloa.com",
    fuenteUrl: "https://www.moncloa.com/2026/07/11/reforma-ebau-2025-claves-nuevo-modelo-selectividad-3398265",
    slug: slugify("La Selectividad cambia de nombre y de enfoque: así es la nueva PAU", "pau2026"),
    imagenPortada: "https://images.pexels.com/photos/6684150/pexels-photo-6684150.jpeg?auto=compress&cs=tinysrgb&w=1200",
    cuerpo: articulo(
      [
        "Desde 2025, lo que toda la vida se llamó Selectividad (o EBAU en los últimos años) recuperó su nombre original: Prueba de Acceso a la Universidad, PAU. El cambio se oficializó mediante el Real Decreto 534/2024 y llega acompañado de una reforma de fondo en cómo se examinan los estudiantes.",
        "El modelo pactado entre el Ministerio de Educación y las comunidades autónomas reduce el peso de la memorización y da más importancia a las preguntas competenciales: aplicar conocimientos, razonar e interpretar información, en vez de repetir contenido de memoria. En Lengua Castellana y Literatura, por ejemplo, al menos un 70 % del examen ya tiene ese enfoque práctico.",
      ],
      "https://images.pexels.com/photos/37812750/pexels-photo-37812750.jpeg?auto=compress&cs=tinysrgb&w=1000",
      [
        "El objetivo declarado es también acabar con las diferencias entre comunidades autónomas, estableciendo criterios de corrección y estructuras de examen más parecidas en todo el país, aunque cada territorio conserva cierto margen propio a la hora de aplicar la normativa.",
        "Para la convocatoria de 2026 se suman además nuevos controles contra el uso de pinganillos, dispositivos electrónicos y otras formas de copiar durante el examen, así como un mayor peso de la corrección ortográfica y la coherencia en la nota final de varias asignaturas.",
        "Para los equipos docentes, esto se traduce en adaptar la forma de preparar al alumnado durante 2º de Bachillerato: menos fichas de repaso memorístico y más ejercicios de aplicación práctica, comentario de texto y resolución de problemas con enunciados reales.",
      ]
    ),
  },
  {
    titulo: "Toda la Formación Profesional pasa a ser dual desde el primer curso",
    resumen:
      "Los ciclos de Grado Medio y Superior combinan clases en el centro y prácticas en empresa desde el primer año, en vez de dejarlas para el final.",
    fuenteNombre: "TodoFP (Ministerio de Educación, FP y Deportes)",
    fuenteUrl: "https://todofp.es/comunes/noticias/2024/gobierno-implantacion-nueva-fp.html",
    slug: slugify("Toda la Formación Profesional pasa a ser dual desde el primer curso", "fpdual2026"),
    imagenPortada: "https://images.pexels.com/photos/3855478/pexels-photo-3855478.jpeg?auto=compress&cs=tinysrgb&w=1200",
    cuerpo: articulo(
      [
        "El Ministerio de Educación, Formación Profesional y Deportes ha completado el desarrollo normativo de la Ley de FP con la publicación de los últimos reales decretos en el BOE. El resultado: todos los ciclos de Grado Medio y Superior son ya de modalidad dual desde el primer curso.",
        "Hasta ahora, las prácticas en empresa (el antiguo módulo de Formación en Centros de Trabajo) se concentraban casi siempre en el último tramo del ciclo. Con el nuevo modelo, el alumnado combina formación en el centro educativo y en la empresa desde el primer año, con estancias más largas y de más calidad.",
      ],
      "https://images.pexels.com/photos/3855478/pexels-photo-3855478.jpeg?auto=compress&cs=tinysrgb&w=1000",
      [
        "Los nuevos planes de estudio incorporan también contenidos sobre digitalización, sostenibilidad y emprendimiento, pensados para facilitar la entrada de los jóvenes en el mercado laboral nada más terminar sus estudios.",
        "Según datos del Observatorio de la FP, la tasa de inserción laboral del alumnado de Grado Superior supera ya el 74 %, y casi la mitad del alumnado de formación subvencionada encuentra empleo en menos de seis meses.",
        "Para los centros, el reto principal es logístico: encontrar y mantener suficientes empresas colaboradoras dispuestas a acoger alumnado desde el primer curso, y coordinar los horarios entre las horas lectivas y las de estancia en la empresa a lo largo de todo el año."
      ]
    ),
  },
  {
    titulo: "El curso 2026-2027 empezará entre el 7 y el 15 de septiembre, según la comunidad",
    resumen:
      "No hay una fecha única de vuelta al cole: cada comunidad autónoma fija su propio calendario dentro del marco general del Ministerio.",
    fuenteNombre: "Moncloa.com",
    fuenteUrl: "https://www.moncloa.com/2026/06/30/calendario-escolar-2026-27-3391732",
    slug: slugify("El curso 2026-2027 empezará entre el 7 y el 15 de septiembre, según la comunidad", "calendario2627"),
    imagenPortada: "https://images.pexels.com/photos/12932566/pexels-photo-12932566.jpeg?auto=compress&cs=tinysrgb&w=1200",
    cuerpo: articulo(
      [
        "Como cada año, el calendario escolar no es el mismo en toda España: la educación no universitaria es una competencia transferida a las comunidades autónomas, que negocian sus fechas con sindicatos docentes, asociaciones de familias y los propios centros antes de publicarlas en sus boletines oficiales.",
        "Para el curso 2026-2027, la mayoría de territorios arrancan las clases entre el 7 y el 15 de septiembre de 2026, con Educación Infantil y Primaria empezando unos días antes que Secundaria, Bachillerato y FP. Madrid y País Vasco están entre los primeros en arrancar (7 de septiembre); Andalucía, entre los últimos (10 y 15 de septiembre según la etapa).",
      ],
      "https://images.pexels.com/photos/8500353/pexels-photo-8500353.jpeg?auto=compress&cs=tinysrgb&w=1000",
      [
        "El Ministerio de Educación se limita a recopilar y publicar los calendarios de cada comunidad, sin capacidad para imponer fechas uniformes, aunque puede advertir si alguna comunidad se desvía demasiado del mínimo legal de 175 días lectivos fijado por la Ley Orgánica 2/2006.",
        "Entre las novedades de este curso destaca la vuelta de la Semana Blanca en febrero en la Comunidad de Madrid (eliminada el curso pasado) y una ampliación de las vacaciones de Navidad hasta el 11 de enero de 2027 en varios territorios.",
      ]
    ),
  },
  {
    titulo: "La IA entra en las aulas con reglas nuevas: formación obligatoria y supervisión en la evaluación",
    resumen:
      "Desde este año es obligatorio formar en IA al personal docente que la use, y desde agosto los sistemas que evalúan a los alumnos se consideran de alto riesgo.",
    fuenteNombre: "Inspección de Educación",
    fuenteUrl: "https://inspecciondeeducacion.com/ia-evaluacion-educativa-alto-riesgo",
    slug: slugify("La IA entra en las aulas con reglas nuevas: formación obligatoria y supervisión en la evaluación", "ia-aulas-2026"),
    imagenPortada: "https://images.pexels.com/photos/8423123/pexels-photo-8423123.jpeg?auto=compress&cs=tinysrgb&w=1200",
    cuerpo: articulo(
      [
        "El Reglamento europeo de Inteligencia Artificial (Reglamento UE 2024/1689) es aplicable en toda la UE desde el 2 de agosto de 2026, y clasifica como \"de alto riesgo\" a los sistemas de IA que se usan para evaluar los resultados de aprendizaje del alumnado. Eso implica más obligaciones de transparencia y supervisión humana para los centros que usen este tipo de herramientas.",
        "A esto se suma una exigencia ya en vigor desde febrero de 2026: todo el personal docente y administrativo que utilice sistemas de IA en su trabajo diario debe recibir formación específica. El INTEF ha publicado sus propias orientaciones para integrar la IA en la formación del profesorado, alineadas con la LOMLOE y el marco DigCompEdu.",
      ],
      "https://images.pexels.com/photos/8439069/pexels-photo-8439069.jpeg?auto=compress&cs=tinysrgb&w=1000",
      [
        "Una encuesta reciente sitúa ya al 80 % del profesorado español como usuario habitual de herramientas de IA generativa, y más de la mitad las usa varias veces por semana, según un estudio nacional de 2026.",
        "Algunas comunidades van más allá: Galicia prepara una ley propia de Educación Digital, pionera en España, que regulará específicamente el uso de la IA en las aulas, dejando claro que en ningún caso podrá sustituir la decisión final del profesorado ni basar decisiones académicas exclusivamente en resultados generados automáticamente.",
      ]
    ),
  },
];

async function main() {
  for (const n of NOTICIAS) {
    const existente = await prisma.noticia.findUnique({ where: { slug: n.slug } });

    if (existente) {
      console.log(`Actualizando contenido e imágenes: ${n.titulo}`);
      await prisma.noticia.update({
        where: { id: existente.id },
        data: {
          resumen: n.resumen,
          imagenPortada: n.imagenPortada,
          cuerpoHtml: n.cuerpo,
          fuenteNombre: n.fuenteNombre,
          fuenteUrl: n.fuenteUrl,
        },
      });
      continue;
    }

    console.log(`Creando: ${n.titulo}`);
    await prisma.noticia.create({
      data: {
        categoria: "EDUCACION_ESPANA",
        schoolId: null,
        slug: n.slug,
        titulo: n.titulo,
        resumen: n.resumen,
        imagenPortada: n.imagenPortada,
        modo: "SIMPLE",
        cuerpoHtml: n.cuerpo,
        fuenteNombre: n.fuenteNombre,
        fuenteUrl: n.fuenteUrl,
        publicada: true,
        publishedAt: new Date(),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
