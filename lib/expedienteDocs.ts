import { prisma } from "@/lib/prisma";

const NORMATIVA_FIXA = [
  {
    titulo: "Article I:",
    text: "Les injúries, ofenses, agressions físiques, amenaces, vexacions o humiliacions a altres membres de la comunitat educativa.",
  },
  {
    titulo: "Article V:",
    text: "L'acció reiterada d'actes contraris a les normes de convivència del centre, malgrat les advertències verbals reiterades per part del professorat, la tutoria i la direcció.",
  },
];

export async function getExpedienteData(expedienteId: string) {
  const exp = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    include: {
      alumno: { select: { nombre: true, curso: true } },
      tutor: { select: { name: true, email: true } },
      school: { select: { name: true, logoUrl: true } },
    },
  });
  if (!exp) return null;

  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("es-ES") : "—");

  return {
    schoolName: exp.school.name,
    schoolLogoUrl: exp.school.logoUrl,
    numero: exp.numero,
    fechaInicio: fmt(exp.fechaInicio),
    alumnoNombre: exp.alumno.nombre,
    alumnoCurso: exp.alumno.curso,
    tutorNombre: exp.tutor.name ?? exp.tutor.email,
    fets: exp.fets,
    testimonis: exp.testimonis,
    informeTutor: exp.informeTutor,
    audienciaResumen: exp.audienciaResumen,
    valoracionComision: exp.valoracionComision,
    medidasProvisionales: exp.medidasProvisionales,
    sancionDias: exp.sancionDias,
    fechaAplicacionInicio: fmt(exp.fechaAplicacionInicio),
    fechaAplicacionFin: fmt(exp.fechaAplicacionFin),
    recursoEstado: exp.recursoEstado,
    direccionNombre: exp.direccionNombre,
    coordinadorNombre: exp.coordinadorNombre,
    fechaTancament: fmt(exp.enviadoEn ?? exp.createdAt),
    firmaDireccion: exp.firmaDireccion,
    firmaTutor: exp.firmaTutor,
    firmaCoordinador: exp.firmaCoordinador,
    firmaAlumno: exp.firmaAlumno,
  };
}

export type ExpedienteData = NonNullable<Awaited<ReturnType<typeof getExpedienteData>>>;

export { NORMATIVA_FIXA };

async function fetchLogoBytes(url: string | null): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    const bytes = new Uint8Array(await res.arrayBuffer());
    // Si no lo dice el content-type, miramos la cabecera del propio archivo:
    // los PNG siempre empiezan por los mismos 8 bytes.
    const isPng =
      contentType.includes("png") ||
      (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47);
    return { bytes, isPng };
  } catch {
    return null;
  }
}

// ------------------- PDF (pdf-lib) -------------------

export async function buildExpedientePdf(data: ExpedienteData): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidth = pageWidth - margin * 2;
  const azul = rgb(0.1, 0.2, 0.45);
  const azulClaro = rgb(0.87, 0.91, 0.98);
  const gris = rgb(0.35, 0.35, 0.35);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function newPageIfNeeded(needed: number) {
    if (y - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function wrapText(text: string, font: typeof fontRegular, size: number, width: number): string[] {
    const paragraphs = text.split("\n");
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
    return lines;
  }

  function drawParagraph(text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number; indent?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? fontBold : fontRegular;
    const color = opts.color ?? rgb(0, 0, 0);
    const indent = opts.indent ?? 0;
    const lines = wrapText(text, font, size, maxWidth - indent);
    for (const line of lines) {
      newPageIfNeeded(size + 4);
      page.drawText(line, { x: margin + indent, y, size, font, color });
      y -= size + 4;
    }
    y -= opts.gap ?? 4;
  }

  function drawSectionHeader(text: string) {
    newPageIfNeeded(26);
    page.drawRectangle({ x: margin, y: y - 18, width: maxWidth, height: 22, color: azulClaro });
    page.drawText(text, { x: margin + 6, y: y - 13, size: 11, font: fontBold, color: azul });
    y -= 30;
  }

  function drawBullets(text: string) {
    const items = text.split("\n").filter((l) => l.trim() !== "");
    for (const item of items) {
      const lines = wrapText(`•  ${item}`, fontRegular, 10, maxWidth - 8);
      lines.forEach((line, i) => {
        newPageIfNeeded(14);
        page.drawText(line, { x: margin + (i === 0 ? 0 : 12), y, size: 10, font: fontRegular });
        y -= 14;
      });
    }
    y -= 6;
  }

  page.drawText("EXPEDIENT SANCIONADOR DISCIPLINARI", { x: margin, y, size: 16, font: fontBold, color: azul });
  y -= 30;

  const logo = await fetchLogoBytes(data.schoolLogoUrl);
  if (logo) {
    try {
      const image = logo.isPng ? await pdfDoc.embedPng(logo.bytes) : await pdfDoc.embedJpg(logo.bytes);
      const logoHeight = 40;
      const logoWidth = (image.width / image.height) * logoHeight;
      page.drawImage(image, {
        x: pageWidth - margin - logoWidth,
        y: pageHeight - margin - logoHeight + 14,
        width: logoWidth,
        height: logoHeight,
      });
    } catch {
      // Si el logo no se puede incrustar (formato raro, etc.), seguimos sin
      // él en vez de romper la generación de todo el documento.
    }
  }

  drawSectionHeader(`1. Centre educatiu: ${data.schoolName}`);
  drawParagraph(`Expedient núm.: ${data.numero}`, { size: 10, gap: 2 });
  drawParagraph(`Data d'inici: ${data.fechaInicio}`, { size: 10, gap: 10 });

  drawSectionHeader("2. Dades de l'alumne");
  drawParagraph(`Nom i cognoms: ${data.alumnoNombre}`, { size: 10, gap: 2 });
  drawParagraph(`Curs i grup: ${data.alumnoCurso}`, { size: 10, gap: 2 });
  drawParagraph(`Tutor/a: ${data.tutorNombre}`, { size: 10, gap: 10 });

  drawSectionHeader("3. Fets que motiven l'obertura de l'expedient");
  drawParagraph("Descripció objectiva i detallada dels fets:", { bold: true, size: 10, gap: 4 });
  drawBullets(data.fets);

  drawSectionHeader("4. Normativa vulnerada");
  drawParagraph(
    "D'acord amb la normativa de convivència i règim disciplinari del centre, els fets descrits constitueixen una falta greu, per la vulneració dels articles següents:",
    { gap: 6 }
  );
  for (const art of NORMATIVA_FIXA) {
    drawParagraph(art.titulo, { bold: true, size: 10, gap: 2 });
    drawParagraph(art.text, { size: 10, gap: 8 });
  }

  drawSectionHeader("5. Procediment seguit");
  drawParagraph(`Obertura formal de l'expedient i notificació a l'alumne: ${data.fechaInicio}`, { size: 10, gap: 6 });
  drawParagraph("Recollida d'informació, testimonis i proves:", { bold: true, size: 10, gap: 3 });
  drawBullets(data.testimonis);
  drawParagraph("Informe del tutor/a:", { bold: true, size: 10, gap: 3 });
  drawParagraph(data.informeTutor, { size: 10, gap: 10 });

  drawSectionHeader("6. Audiència a l'alumne");
  drawParagraph(data.audienciaResumen, { size: 10, gap: 10 });

  drawSectionHeader("7. Valoració de la Comissió de disciplina");
  drawParagraph(data.valoracionComision, { size: 10, gap: 10 });

  drawSectionHeader("8. Mesures provisionals");
  drawParagraph(data.medidasProvisionales || "—", { size: 10, gap: 10 });

  drawSectionHeader("9. Resolució");
  drawParagraph(
    `Sanció: La Comissió de disciplina ha acordat imposar la següent sanció: expulsió del centre durant ${data.sancionDias} dies lectius.`,
    { size: 10, gap: 6 }
  );
  drawParagraph(`Data d'aplicació: del ${data.fechaAplicacionInicio} al ${data.fechaAplicacionFin}, ambdós inclosos.`, { size: 10, gap: 10 });

  drawSectionHeader("10. Informació sobre recursos");
  drawParagraph(
    "Es recorda el dret a presentar per escrit un recurs intern davant Direcció en un termini de 48 hores.",
    { size: 10, gap: 6 }
  );
  const recursoTexto =
    data.recursoEstado === "DECLARA"
      ? "Declara tenir intenció de presentar un recurs"
      : data.recursoEstado === "RENUNCIA"
      ? "Renuncia al dret a presentar un recurs i sol·licita l'aplicació immediata de la resolució"
      : "Pendent de resposta de l'alumne";
  drawParagraph(recursoTexto, { size: 10, gap: 14 });

  drawParagraph(`Data de tancament: ${data.fechaTancament}`, { bold: true, size: 10, gap: 12 });

  newPageIfNeeded(70);
  const colWidth = maxWidth / 4;
  const firmas = [
    { label: "Direcció del centre", nombre: data.direccionNombre, firma: data.firmaDireccion },
    { label: "Tutor/a de l'alumne/a", nombre: data.tutorNombre, firma: data.firmaTutor },
    { label: "Coordinador de Departament", nombre: data.coordinadorNombre, firma: data.firmaCoordinador },
    { label: "Alumne/a", nombre: data.alumnoNombre, firma: data.firmaAlumno },
  ];
  for (let i = 0; i < firmas.length; i++) {
    const f = firmas[i];
    const x = margin + i * colWidth;
    page.drawText(f.label, { x, y, size: 9, font: fontBold, color: gris });

    if (f.firma) {
      try {
        const base64 = f.firma.split(",")[1] ?? f.firma;
        const bytes = Buffer.from(base64, "base64");
        const image = await pdfDoc.embedPng(bytes);
        const imgHeight = 30;
        const imgWidth = (image.width / image.height) * imgHeight;
        page.drawImage(image, { x, y: y - imgHeight - 4, width: Math.min(imgWidth, colWidth - 10), height: imgHeight });
        page.drawText(f.nombre || "—", { x, y: y - imgHeight - 16, size: 9, font: fontRegular });
        continue;
      } catch {
        // Si la firma no se puede incrustar, seguimos mostrando solo el nombre.
      }
    }
    page.drawText(f.nombre || "—", { x, y: y - 14, size: 9, font: fontRegular });
  }

  return pdfDoc.save();
}

// ------------------- DOCX (docx) -------------------

export async function buildExpedienteDocx(data: ExpedienteData) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
    AlignmentType,
    ImageRun,
  } = await import("docx");

  const logo = await fetchLogoBytes(data.schoolLogoUrl);
  const logoRun = logo
    ? new ImageRun({
        data: logo.bytes,
        type: logo.isPng ? "png" : "jpg",
        transformation: { width: 90, height: 45 },
      })
    : null;

  function firmaRun(dataUrl: string | null) {
    if (!dataUrl) return null;
    try {
      const base64 = dataUrl.split(",")[1] ?? dataUrl;
      return new ImageRun({
        data: Buffer.from(base64, "base64"),
        type: "png",
        transformation: { width: 110, height: 45 },
      });
    } catch {
      return null;
    }
  }

  const firmaDireccionRun = firmaRun(data.firmaDireccion);
  const firmaTutorRun = firmaRun(data.firmaTutor);
  const firmaCoordinadorRun = firmaRun(data.firmaCoordinador);
  const firmaAlumnoRun = firmaRun(data.firmaAlumno);

  const sectionHeader = (text: string) =>
    new Paragraph({
      shading: { type: ShadingType.SOLID, color: "DCE6F7" },
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, bold: true, color: "1A2E73", size: 24 })],
    });

  const bulletList = (text: string) =>
    text
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map(
        (line) =>
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: line, size: 22 })],
          })
      );

  const infoRow = (label: string, value: string) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22 })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 22 })] })],
        }),
      ],
    });

  const recursoTexto =
    data.recursoEstado === "DECLARA"
      ? "Declara tenir intenció de presentar un recurs"
      : data.recursoEstado === "RENUNCIA"
      ? "Renuncia al dret a presentar un recurs i sol·licita l'aplicació immediata de la resolució"
      : "Pendent de resposta de l'alumne";

  const doc = new Document({
    sections: [
      {
        children: [
          ...(logoRun
            ? [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 100 }, children: [logoRun] })]
            : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: "EXPEDIENT SANCIONADOR DISCIPLINARI", bold: true, size: 32, color: "1A2E73" })],
          }),

          sectionHeader(`1. Centre educatiu: ${data.schoolName}`),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [infoRow("Expedient núm.:", data.numero), infoRow("Data d'inici:", data.fechaInicio)],
          }),

          sectionHeader("2. Dades de l'alumne"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              infoRow("Nom i cognoms:", data.alumnoNombre),
              infoRow("Curs i grup:", data.alumnoCurso),
              infoRow("Tutor/a:", data.tutorNombre),
            ],
          }),

          sectionHeader("3. Fets que motiven l'obertura de l'expedient"),
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: "Descripció objectiva i detallada dels fets:", bold: true, size: 22 })],
          }),
          ...bulletList(data.fets),

          sectionHeader("4. Normativa vulnerada"),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: "D'acord amb la normativa de convivència i règim disciplinari del centre, els fets descrits constitueixen una falta greu, per la vulneració dels articles següents:",
                size: 22,
              }),
            ],
          }),
          ...NORMATIVA_FIXA.flatMap((art) => [
            new Paragraph({ children: [new TextRun({ text: art.titulo, bold: true, size: 22 })] }),
            new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: art.text, size: 22 })] }),
          ]),

          sectionHeader("5. Procediment seguit"),
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: `Obertura formal de l'expedient i notificació a l'alumne: ${data.fechaInicio}`, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: "Recollida d'informació, testimonis i proves:", bold: true, size: 22 })],
          }),
          ...bulletList(data.testimonis),
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: "Informe del tutor/a:", bold: true, size: 22 })],
          }),
          new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: data.informeTutor, size: 22 })] }),

          sectionHeader("6. Audiència a l'alumne"),
          new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: data.audienciaResumen, size: 22 })] }),

          sectionHeader("7. Valoració de la Comissió de disciplina"),
          new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: data.valoracionComision, size: 22 })] }),

          sectionHeader("8. Mesures provisionals"),
          new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: data.medidasProvisionales || "—", size: 22 })] }),

          sectionHeader("9. Resolució"),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `Sanció: La Comissió de disciplina ha acordat imposar la següent sanció: expulsió del centre durant ${data.sancionDias} dies lectius.`,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({ text: `Data d'aplicació: del ${data.fechaAplicacionInicio} al ${data.fechaAplicacionFin}, ambdós inclosos.`, size: 22 }),
            ],
          }),

          sectionHeader("10. Informació sobre recursos"),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Es recorda el dret a presentar per escrit un recurs intern davant Direcció en un termini de 48 hores.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: recursoTexto, size: 22 })] }),

          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: `Data de tancament: ${data.fechaTancament}`, bold: true, size: 22 })],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Direcció del centre", bold: true, size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tutor/a de l'alumne/a", bold: true, size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Coordinador de Departament", bold: true, size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Alumne/a", bold: true, size: 20 })] })] }),
                ],
              }),
              new TableRow({
                children: [firmaDireccionRun, firmaTutorRun, firmaCoordinadorRun, firmaAlumnoRun].map(
                  (run) => new TableCell({ children: [new Paragraph({ children: run ? [run] : [] })] })
                ),
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.direccionNombre || "—", size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.tutorNombre || "—", size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.coordinadorNombre || "—", size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.alumnoNombre || "—", size: 20 })] })] }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
