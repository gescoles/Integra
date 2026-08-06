import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { DashboardHeader } from "../../components/DashboardHeader";
import { translate } from "../../i18n";
import { DetalleClient } from "./DetalleClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FichaPracticaPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";

  const ficha = await prisma.practicaAlumno.findUnique({
    where: { id: params.id },
    include: {
      alumno: { select: { id: true, nombre: true, curso: true, avatarUrl: true } },
      tutorImes: { select: { id: true, name: true, email: true } },
      convenios: {
        include: { prorrogas: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!ficha) notFound();

  const puedeGestionar =
    role === "SUPERADMIN" ||
    ((role === "COORDINADOR" || role === "ADMIN_CENTRO") && ficha.schoolId === session?.user.schoolId) ||
    ficha.tutorImesId === session?.user.id;

  if (!puedeGestionar) redirect("/dashboard/practicas");

  const profesoresRaw = await prisma.user.findMany({
    where: { schoolId: ficha.schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <DashboardHeader
        title={ficha.alumno.nombre}
        subtitle={translate(locale, "practicas.subtitleFicha")}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <DetalleClient
        ficha={{
          id: ficha.id,
          alumnoNombre: ficha.alumno.nombre,
          alumnoCurso: ficha.alumno.curso,
          alumnoAvatarUrl: ficha.alumno.avatarUrl,
          promocion: ficha.promocion,
          cicloFormativo: ficha.cicloFormativo,
          anyTitulacion: ficha.anyTitulacion,
          tutorImesId: ficha.tutorImesId,
          tutorImesNombre: ficha.tutorImes?.name ?? ficha.tutorImes?.email ?? null,
          dni: ficha.dni,
          fechaNacimiento: ficha.fechaNacimiento?.toISOString() ?? null,
          telefono: ficha.telefono,
          direccion: ficha.direccion,
          correoAlumno: ficha.correoAlumno,
          cap: ficha.cap,
          nuss: ficha.nuss,
        }}
        convenios={ficha.convenios.map((c) => ({
          id: c.id,
          tipologia: c.tipologia,
          estadoAcuerdo: c.estadoAcuerdo,
          convalida: c.convalida,
          quienAltaBajaSS: c.quienAltaBajaSS,
          fechaInicio: c.fechaInicio?.toISOString() ?? null,
          fechaFin: c.fechaFin?.toISOString() ?? null,
          periodo: c.periodo,
          empresaCif: c.empresaCif,
          empresaNombre: c.empresaNombre,
          tutorEmpresaNombre: c.tutorEmpresaNombre,
          tutorEmpresaTelefono: c.tutorEmpresaTelefono,
          tutorEmpresaCorreo: c.tutorEmpresaCorreo,
          observaciones: c.observaciones,
          prorrogas: c.prorrogas.map((p) => ({
            id: p.id,
            fechaInicio: p.fechaInicio?.toISOString() ?? null,
            fechaFin: p.fechaFin?.toISOString() ?? null,
            observaciones: p.observaciones,
          })),
        }))}
        profesores={profesoresRaw.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
      />
    </div>
  );
}
