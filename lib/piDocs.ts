import { prisma } from "@/lib/prisma";

export async function getPIDocumentoData(documentoId: string) {
  const documento = await prisma.pIDocumento.findUnique({
    where: { id: documentoId },
    include: {
      alumnoPi: {
        include: {
          alumno: { select: { nombre: true, profesorId: true } },
          school: { select: { name: true, logoUrl: true, directorPIEmail: true } },
        },
      },
    },
  });
  return documento;
}

async function fetchLogoBytes(url: string | null): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    const bytes = new Uint8Array(await res.arrayBuffer());
    const isPng =
      contentType.includes("png") ||
      (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47);
    return { bytes, isPng };
  } catch {
    return null;
  }
}

const TEXTOS_PDF: Record<"CA" | "ES", Record<string, string>> = {
  CA: {
    titulo: "PLA D'ADAPTACIÓ INDIVIDUAL (PI)",
    cursAcademic: "Curs acadèmic",
    seccio1: "1. Dades personals i acadèmiques",
    nomAlumne: "Nom i cognoms de l'alumne/a",
    estudisEnCurs: "Estudis en curs",
    dataNaixement: "Data de naixement",
    llocNaixement: "Lloc de naixement",
    dataArribada: "Data d'arribada a Catalunya",
    tutor: "Tutor/a (responsable del PI)",
    llengua: "Llengua d'ús habitual",
    planAnterior: "Ha estat objecte d'un pla individualitzat en cursos anteriors?",
    mesuresRebudes: "Tipus de mesures i suports rebuts fins a l'actualitat",
    repeticions: "Repeticions de curs",
    quin: "Quin/s",
    centresAnteriors: "Centres on ha estat matriculat anteriorment",
    dataInici: "Data d'inici del PI",
    periodeValidesa: "Període de validesa",
    altresInfo: "Altres informacions d'interès",
    justificacio: "2. Justificació de la necessitat",
    infoNEE: "Informe de reconeixement de necessitats específiques de suport educatiu",
    avaluacioPsico: "Avaluació psicopedagògica",
    avaluacioInicial: "Resultat de l'avaluació inicial de l'alumne/a",
    origenEstranger: "Avaluació de l'alumne/a d'origen estranger",
    decisioCAD: "Decisió CAD",
    aPropostaDe: "a proposta de",
    altres: "Altres",
    motivatPer: "Motivat per",
    descripcioNecessitat: "Breu descripció de la necessitat d'elaboració del PI",
    seccio2: "3. Professionals i serveis que intervenen",
    propostaEducativa: "4. Proposta educativa — Mesures i suports per a l'alumne/a",
    horariPersonalitzat: "Necessitat d'horari personalitzat",
    conformitat: "5. Conformitat del pla — firmes",
    tutorFirma: "Tutor/a",
    directorFirma: "Director/a",
    familiaFirma: "Família",
    alumneFirma: "Alumne/a",
    firmatEl: "Firmat el",
    pendent: "Pendent",
    noFirmat: "No firmat",
    si: "SI",
    no: "NO",
  },
  ES: {
    titulo: "PLAN DE ADAPTACIÓN INDIVIDUAL (PI)",
    cursAcademic: "Curso académico",
    seccio1: "1. Datos personales y académicos",
    nomAlumne: "Nombre y apellidos del alumno/a",
    estudisEnCurs: "Estudios en curso",
    dataNaixement: "Fecha de nacimiento",
    llocNaixement: "Lugar de nacimiento",
    dataArribada: "Fecha de llegada a Cataluña",
    tutor: "Tutor/a (responsable del PI)",
    llengua: "Lengua de uso habitual",
    planAnterior: "¿Ha sido objeto de un plan individualizado en cursos anteriores?",
    mesuresRebudes: "Tipo de medidas y apoyos recibidos hasta la actualidad",
    repeticions: "Repeticiones de curso",
    quin: "Cuál/es",
    centresAnteriors: "Centros donde ha estado matriculado anteriormente",
    dataInici: "Fecha de inicio del PI",
    periodeValidesa: "Periodo de validez",
    altresInfo: "Otras informaciones de interés",
    justificacio: "2. Justificación de la necesidad",
    infoNEE: "Informe de reconocimiento de necesidades específicas de apoyo educativo",
    avaluacioPsico: "Evaluación psicopedagógica",
    avaluacioInicial: "Resultado de la evaluación inicial del alumno/a",
    origenEstranger: "Evaluación del alumno/a de origen extranjero",
    decisioCAD: "Decisión CAD",
    aPropostaDe: "a propuesta de",
    altres: "Otros",
    motivatPer: "Motivado por",
    descripcioNecessitat: "Breve descripción de la necesidad de elaboración del PI",
    seccio2: "3. Profesionales y servicios que intervienen",
    propostaEducativa: "4. Propuesta educativa — Medidas y apoyos para el alumno/a",
    horariPersonalitzat: "Necesidad de horario personalizado",
    conformitat: "5. Conformidad del plan — firmas",
    tutorFirma: "Tutor/a",
    directorFirma: "Director/a",
    familiaFirma: "Familia",
    alumneFirma: "Alumno/a",
    firmatEl: "Firmado el",
    pendent: "Pendiente",
    noFirmat: "No Firmado",
    si: "SÍ",
    no: "NO",
  },
};

// PDF del "Pla d'Adaptació Individual" — replica el contenido completo
// del documento (no es una copia visual exacta del Word original, pero
// no le falta ningún campo), en el idioma elegido al crear el PI.
// PDF del "Pla d'Adaptació Individual" — replica la estructura de tablas
// del Word original (cabecera con logo, tablas con cabecera gris,
// fila etiqueta+valor), en el idioma elegido al crear el PI.
export async function buildPIPdf(documento: NonNullable<Awaited<ReturnType<typeof getPIDocumentoData>>>): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");

  const idioma = documento.idioma === "ES" ? "ES" : "CA";
  const t = TEXTOS_PDF[idioma];

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidth = pageWidth - margin * 2;
  const azul = rgb(0.1, 0.2, 0.45);
  const azulClaro = rgb(0.87, 0.91, 0.98);
  const grisClaro = rgb(0.94, 0.94, 0.95);
  const gris = rgb(0.45, 0.45, 0.45);
  const negro = rgb(0.05, 0.05, 0.08);
  const blanco = rgb(1, 1, 1);
  const bordeGris = rgb(0.75, 0.75, 0.78);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function nuevaPagina() {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  function espacioLibre(necesario: number) {
    if (y - necesario < margin) nuevaPagina();
  }

  function wrapText(text: string, font: typeof fontRegular, size: number, width: number): string[] {
    const paragraphs = (text || "").split("\n");
    const lines: string[] = [];
    for (const para of paragraphs) {
      if (para.trim() === "") {
        lines.push("");
        continue;
      }
      const words = para.split(" ");
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) > width) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }
    return lines.length ? lines : [""];
  }

  // ---------- Cabecera con logo + título, como el Word ----------
  const logo = await fetchLogoBytes(documento.alumnoPi.school.logoUrl);
  let logoImg = null;
  if (logo) {
    try {
      logoImg = logo.isPng ? await pdfDoc.embedPng(logo.bytes) : await pdfDoc.embedJpg(logo.bytes);
    } catch {
      logoImg = null;
    }
  }

  const alturaCabecera = 54;
  page.drawRectangle({ x: margin, y: y - alturaCabecera, width: maxWidth, height: alturaCabecera, borderColor: bordeGris, borderWidth: 1 });
  if (logoImg) {
    const logoAltura = 34;
    const logoAncho = (logoImg.width / logoImg.height) * logoAltura;
    page.drawImage(logoImg, { x: margin + 10, y: y - alturaCabecera / 2 - logoAltura / 2, width: logoAncho, height: logoAltura });
  } else {
    page.drawText(documento.alumnoPi.school.name, { x: margin + 10, y: y - alturaCabecera / 2 - 4, size: 12, font: fontBold, color: azul });
  }
  const tituloAncho = fontBold.widthOfTextAtSize(t.titulo, 14);
  page.drawText(t.titulo, { x: pageWidth - margin - 10 - tituloAncho, y: y - 22, size: 14, font: fontBold, color: azul });
  const cursoTexto = `${t.cursAcademic}: ${documento.cursoAcademico || "—"}`;
  const cursoAncho = fontRegular.widthOfTextAtSize(cursoTexto, 10);
  page.drawText(cursoTexto, { x: pageWidth - margin - 10 - cursoAncho, y: y - 40, size: 10, font: fontRegular, color: gris });
  y -= alturaCabecera + 18;

  function drawSectionHeader(text: string) {
    espacioLibre(40);
    y -= 10;
    page.drawRectangle({ x: margin, y: y - 20, width: maxWidth, height: 24, color: azulClaro });
    page.drawText(text, { x: margin + 6, y: y - 14, size: 11.5, font: fontBold, color: azul });
    y -= 34;
  }

  // Tabla de 2 columnas: etiqueta (fondo gris) | valor. Cada fila
  // calcula su propia altura según el texto que le quepa envuelto.
  function drawKeyValueRow(label: string, value: string | null | undefined, anchoLabel = 190) {
    const anchoValor = maxWidth - anchoLabel;
    const lineasLabel = wrapText(label, fontBold, 9, anchoLabel - 12);
    const lineasValor = wrapText(value || "—", fontRegular, 9.5, anchoValor - 12);
    const lineas = Math.max(lineasLabel.length, lineasValor.length);
    const alturaFila = lineas * 12 + 10;
    espacioLibre(alturaFila);

    page.drawRectangle({ x: margin, y: y - alturaFila, width: anchoLabel, height: alturaFila, color: grisClaro, borderColor: bordeGris, borderWidth: 0.75 });
    page.drawRectangle({ x: margin + anchoLabel, y: y - alturaFila, width: anchoValor, height: alturaFila, borderColor: bordeGris, borderWidth: 0.75 });

    lineasLabel.forEach((linea, i) => {
      page.drawText(linea, { x: margin + 6, y: y - 13 - i * 12, size: 9, font: fontBold, color: negro });
    });
    lineasValor.forEach((linea, i) => {
      page.drawText(linea, { x: margin + anchoLabel + 6, y: y - 13 - i * 12, size: 9.5, font: fontRegular, color: negro });
    });
    y -= alturaFila;
  }

  // Fila de tabla genérica con N columnas de anchos dados.
  function drawTableRow(celdas: { texto: string; negrita?: boolean; fondo?: boolean }[], anchos: number[], size = 9.5) {
    const lineasPorCelda = celdas.map((c, i) => wrapText(c.texto, c.negrita ? fontBold : fontRegular, size, anchos[i] - 12));
    const lineas = Math.max(...lineasPorCelda.map((l) => l.length));
    const alturaFila = lineas * 12 + 10;
    espacioLibre(alturaFila);

    let x = margin;
    celdas.forEach((c, i) => {
      page.drawRectangle({ x, y: y - alturaFila, width: anchos[i], height: alturaFila, color: c.fondo ? grisClaro : blanco, borderColor: bordeGris, borderWidth: 0.75 });
      lineasPorCelda[i].forEach((linea, li) => {
        page.drawText(linea, { x: x + 6, y: y - 13 - li * 12, size, font: c.negrita ? fontBold : fontRegular, color: negro });
      });
      x += anchos[i];
    });
    y -= alturaFila;
  }

  function drawSiNoInline(label: string, valor: boolean | null, anchoLabel = 340) {
    const texto = valor === null ? "—" : valor ? t.si : t.no;
    drawKeyValueRow(label, texto, anchoLabel);
  }

  // ---------- 1. Dades personals i acadèmiques ----------
  drawSectionHeader(t.seccio1);
  drawKeyValueRow(t.nomAlumne, documento.nombreAlumno);
  drawKeyValueRow(t.estudisEnCurs, documento.estudiosEnCurso);
  drawKeyValueRow(t.dataNaixement, documento.fechaNacimiento);
  drawKeyValueRow(t.llocNaixement, documento.lugarNacimiento);
  drawKeyValueRow(t.dataArribada, documento.fechaLlegadaCatalunya);
  drawKeyValueRow(t.tutor, documento.tutorNombre);
  drawKeyValueRow(t.llengua, documento.lenguaHabitual);
  drawSiNoInline(t.planAnterior, documento.planAnteriorSiNo);
  drawKeyValueRow(t.mesuresRebudes, documento.medidasRecibidas);
  drawSiNoInline(t.repeticions, documento.repeticionCursoSiNo);
  if (documento.repeticionCursoSiNo) drawKeyValueRow(t.quin, documento.repeticionCual);
  drawKeyValueRow(t.centresAnteriors, documento.centrosAnteriores);
  drawKeyValueRow(t.dataInici, documento.fechaInicioPI);
  drawKeyValueRow(t.periodeValidesa, documento.periodoValidez);
  drawKeyValueRow(t.altresInfo, documento.otrasInfoInteres);

  // ---------- Justificació de la necessitat ----------
  drawSectionHeader(t.justificacio);
  const motivos: string[] = [];
  if (documento.motivoInformeNEE) motivos.push(t.infoNEE);
  if (documento.motivoAvaluacioPsico) motivos.push(t.avaluacioPsico);
  if (documento.motivoAvaluacioInicial) motivos.push(t.avaluacioInicial);
  if (documento.motivoOrigenEstranger) motivos.push(t.origenEstranger);
  if (documento.motivoCAD) motivos.push(`${t.decisioCAD}${documento.motivoCADPropuesta ? ` — ${t.aPropostaDe} ${documento.motivoCADPropuesta}` : ""}`);
  if (documento.motivoAltres) motivos.push(`${t.altres}: ${documento.motivoAltresTexto ?? ""}`);
  drawKeyValueRow(t.motivatPer, motivos.length ? motivos.join(" · ") : "—");
  drawKeyValueRow(t.descripcioNecessitat, documento.descripcionNecesidad);

  // ---------- 2. Professionals i serveis que intervenen ----------
  drawSectionHeader(t.seccio2);
  const profesionales = (documento.profesionales as { tipo: string; marcado?: boolean; nombre: string }[] | null) ?? [];
  const profesionalesMarcados = profesionales.filter((p) => p.marcado);
  if (profesionalesMarcados.length === 0) {
    drawTableRow([{ texto: "—" }], [maxWidth]);
  } else {
    profesionalesMarcados.forEach((p) => {
      drawTableRow([{ texto: p.tipo, negrita: true, fondo: true }, { texto: p.nombre || "—" }], [maxWidth * 0.55, maxWidth * 0.45]);
    });
  }

  // ---------- Proposta educativa — Mesures i suports ----------
  drawSectionHeader(t.propostaEducativa);
  const medidas = (documento.medidasSoportes as { materia: string; medida: string }[] | null) ?? [];
  drawTableRow([{ texto: t.materia, negrita: true, fondo: true }, { texto: t.mesura, negrita: true, fondo: true }], [maxWidth * 0.28, maxWidth * 0.72]);
  if (medidas.length === 0) {
    drawTableRow([{ texto: "—" }, { texto: "" }], [maxWidth * 0.28, maxWidth * 0.72]);
  } else {
    medidas.forEach((m) => drawTableRow([{ texto: m.materia }, { texto: m.medida }], [maxWidth * 0.28, maxWidth * 0.72]));
  }
  drawSiNoInline(t.horariPersonalitzat, documento.horarioPersonalizadoSiNo);

  // ---------- 5. Conformitat del pla — firmes ----------
  drawSectionHeader(t.conformitat);
  const anchoCol = maxWidth / 2;
  function drawFirmaCelda(titulo: string, fecha: Date | null, x: number, yTop: number, alto: number) {
    page.drawRectangle({ x, y: yTop - alto, width: anchoCol, height: alto, borderColor: bordeGris, borderWidth: 0.75 });
    page.drawText(titulo, { x: x + 8, y: yTop - 16, size: 9.5, font: fontBold, color: azul });
    page.drawText(fecha ? `${t.firmatEl} ${fecha.toLocaleDateString("es-ES")}` : t.pendent, { x: x + 8, y: yTop - 30, size: 9, font: fontRegular, color: fecha ? negro : gris });
  }
  async function drawFirmaImagen(imagenBase64: string | null, x: number, yTop: number, alto: number) {
    if (!imagenBase64) return;
    try {
      const base64Firma = imagenBase64.split(",")[1] ?? imagenBase64;
      const firmaImg = await pdfDoc.embedPng(new Uint8Array(Buffer.from(base64Firma, "base64")));
      const alturaImg = 22;
      const anchoImg = (firmaImg.width / firmaImg.height) * alturaImg;
      page.drawImage(firmaImg, { x: x + 8, y: yTop - alto + 4, width: Math.min(anchoImg, anchoCol - 16), height: alturaImg });
    } catch {
      // si la imagen no se puede incrustar, se deja solo el texto de "Firmado el..."
    }
  }
  function drawSelloNoFirmado(x: number, yTop: number, alto: number) {
    const rojo = rgb(0.8, 0.15, 0.15);
    page.drawRectangle({
      x: x + 8,
      y: yTop - alto + 6,
      width: 90,
      height: 18,
      borderColor: rojo,
      borderWidth: 1.5,
      rotate: degrees(-6),
    });
    page.drawText(t.noFirmat.toUpperCase(), { x: x + 14, y: yTop - alto + 11, size: 9, font: fontBold, color: rojo, rotate: degrees(-6) });
  }
  const altoFirmas = 60;
  espacioLibre(altoFirmas * 2 + 4);
  const yInicioFirmas = y;
  drawFirmaCelda(t.tutorFirma, documento.tutorFirmaFecha, margin, yInicioFirmas, altoFirmas);
  drawFirmaCelda(t.directorFirma, documento.directorFirmaFecha, margin + anchoCol, yInicioFirmas, altoFirmas);
  await drawFirmaImagen(documento.tutorFirmaImagen, margin, yInicioFirmas, altoFirmas);
  await drawFirmaImagen(documento.directorFirmaImagen, margin + anchoCol, yInicioFirmas, altoFirmas);
  y -= altoFirmas;
  const yInicioFirmas2 = y;
  drawFirmaCelda(t.familiaFirma, documento.firmaFamiliaFecha, margin, yInicioFirmas2, altoFirmas);
  drawFirmaCelda(t.alumneFirma, documento.firmaAlumnoFecha, margin + anchoCol, yInicioFirmas2, altoFirmas);
  if (documento.firmaFamiliaRechazada) {
    drawSelloNoFirmado(margin, yInicioFirmas2, altoFirmas);
  } else {
    await drawFirmaImagen(documento.firmaFamiliaImagen, margin, yInicioFirmas2, altoFirmas);
  }
  if (documento.firmaAlumnoRechazada) {
    drawSelloNoFirmado(margin + anchoCol, yInicioFirmas2, altoFirmas);
  } else {
    await drawFirmaImagen(documento.firmaAlumnoImagen, margin + anchoCol, yInicioFirmas2, altoFirmas);
  }
  y -= altoFirmas;

  return pdfDoc.save();
}
