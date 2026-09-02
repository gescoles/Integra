import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPIDocumentoData, buildPIPdf } from "@/lib/piDocs";
import { safeFileName } from "@/lib/exportWorkbooks";

export async function GET(req: NextRequest, { params }: { params: { documentoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const documento = await getPIDocumentoData(params.documentoId);
  if (!documento) return new NextResponse("No se ha encontrado el documento.", { status: 404 });
  if (documento.alumnoPi.schoolId !== session.user.schoolId) {
    return new NextResponse("No autorizado para este centro.", { status: 403 });
  }
  if (documento.estado !== "CERRADO") {
    return new NextResponse("Este PI todavía no está cerrado.", { status: 400 });
  }

  // Permisos de descarga: la psicopedagoga y el equipo directivo pueden
  // descargar cualquier PI del centro; el director (el correo
  // configurado para firmar) también; un tutor solo puede descargar el
  // PI de un alumno al que él mismo tutoriza.
  const school = await prisma.school.findUnique({ where: { id: session.user.schoolId }, select: { psicopedagogaId: true } });
  const esPsicopedagoga = school?.psicopedagogaId === session.user.id;
  const esEquipoDirectivo = ["SUPERADMIN", "COORDINADOR", "ADMIN_CENTRO", "ADMINISTRACION"].includes(session.user.role ?? "");
  const esDirectorFijo = Boolean(documento.alumnoPi.school.directorPIEmail) && session.user.email === documento.alumnoPi.school.directorPIEmail;
  const esTutorDelAlumno = documento.alumnoPi.alumno.profesorId === session.user.id;

  if (!esPsicopedagoga && !esEquipoDirectivo && !esDirectorFijo && !esTutorDelAlumno) {
    return new NextResponse("No tienes acceso a este PI.", { status: 403 });
  }

  const pdfBytes = await buildPIPdf(documento);
  const filename = `PI_${safeFileName(documento.alumnoPi.alumno.nombre)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
