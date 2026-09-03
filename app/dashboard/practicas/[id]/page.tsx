import { getServerSession } from "next-auth";
import { Suspense } from "react";
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
  const esDirectivo = role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";

  const ficha = await prisma.practicaAlumno.findUnique({
    where: { id: params.id },
    include: {
      alumno: { select: { id: true, nombre: true, curso: true, avatarUrl: true, fechaNacimiento: true, tipoDocumento: true, numeroDocumento: true, direccion: true } },
      tutorImes: { select: { id: true, name: true, email: true } },
      responsablePracticas: { select: { id: true, name: true, email: true } },
      convenios: {
        include: {
          prorrogas: { orderBy: { createdAt: "asc" } },
          tutoriasSeguimiento: true,
          cerradoPor: { select: { name: true, email: true } },
          departamento: { select: { id: true, nombre: true } },
          modulos: { include: { moduloProfesional: true }, orderBy: { moduloProfesional: { orden: "asc" } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!ficha) notFound();

  const profesoresRaw = esDirectivo
    ? await prisma.user.findMany({
        where: { schoolId: ficha.schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];
  const profesores = profesoresRaw.map((p) => ({ id: p.id, name: p.name ?? p.email }));

  const puedeGestionar =
    role === "SUPERADMIN" ||
    ((role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION") && ficha.schoolId === session?.user.schoolId) ||
    ficha.responsablePracticasId === session?.user.id ||
    ficha.tutorImesId === session?.user.id;

  if (!puedeGestionar) redirect("/dashboard/practicas");

  return (
    <div>
      <DashboardHeader
        title={ficha.alumno.nombre}
        subtitle={translate(locale, "practicas.subtitleFicha")}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <Suspense fallback={null}>
        <DetalleClient
        esDirectivo={esDirectivo}
        profesores={profesores}
        ficha={{
          id: ficha.id,
          alumnoNombre: ficha.alumno.nombre,
          alumnoCurso: ficha.alumno.curso,
          alumnoAvatarUrl: ficha.alumno.avatarUrl,
          alumnoFechaNacimiento: ficha.alumno.fechaNacimiento?.toISOString() ?? null,
          alumnoTipoDocumento: ficha.alumno.tipoDocumento,
          alumnoNumeroDocumento: ficha.alumno.numeroDocumento,
          alumnoDireccion: ficha.alumno.direccion,
          promocion: ficha.promocion,
          cicloFormativo: ficha.cicloFormativo,
          anyTitulacion: ficha.anyTitulacion,
          tutorImesId: ficha.tutorImesId,
          tutorImesNombre: ficha.tutorImes?.name ?? ficha.tutorImes?.email ?? null,
          responsablePracticasId: ficha.responsablePracticasId,
          responsablePracticasNombre: ficha.responsablePracticas?.name ?? ficha.responsablePracticas?.email ?? null,
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
          horasConvalidadas: c.horasConvalidadas,
          anyCurso: c.anyCurso,
          quienAltaBajaSS: c.quienAltaBajaSS,
          fechaInicio: c.fechaInicio?.toISOString() ?? null,
          fechaFin: c.fechaFin?.toISOString() ?? null,
          periodo: c.periodo,
          empresaId: c.empresaId,
          empresaCif: c.empresaCif,
          empresaNombre: c.empresaNombre,
          tutorEmpresaNombre: c.tutorEmpresaNombre,
          tutorEmpresaTelefono: c.tutorEmpresaTelefono,
          tutorEmpresaCorreo: c.tutorEmpresaCorreo,
          observaciones: c.observaciones,
          cerrado: c.cerrado,
          notaFinal: c.notaFinal,
          fechaCierre: c.fechaCierre?.toISOString() ?? null,
          cerradoPorNombre: c.cerradoPor?.name ?? c.cerradoPor?.email ?? null,
          departamentoId: c.departamentoId,
          departamentoNombre: c.departamento?.nombre ?? null,
          cicloGrupo: c.cicloGrupo,
          modulos: c.modulos.map((m) => ({
            id: m.id,
            moduloProfesionalId: m.moduloProfesionalId,
            codigo: m.moduloProfesional.codigo,
            nombre: m.moduloProfesional.nombre,
            horasEmpresa: m.horasEmpresa,
            nota: m.nota,
            notaEnviada: m.notaEnviada,
          })),
          tutoriasSeguimiento: c.tutoriasSeguimiento.map((t) => ({
            id: t.id,
            tipo: t.tipo,
            fecha: t.fecha?.toISOString() ?? null,
            resumen: t.resumen,
            medioContacto: t.medioContacto,
          })),
          prorrogas: c.prorrogas.map((p) => ({
            id: p.id,
            tipologia: p.tipologia,
            estadoAcuerdo: p.estadoAcuerdo,
            convalida: p.convalida,
            quienAltaBajaSS: p.quienAltaBajaSS,
            fechaInicio: p.fechaInicio?.toISOString() ?? null,
            fechaFin: p.fechaFin?.toISOString() ?? null,
            periodo: p.periodo,
            empresaCif: p.empresaCif,
            empresaNombre: p.empresaNombre,
            tutorEmpresaNombre: p.tutorEmpresaNombre,
            tutorEmpresaTelefono: p.tutorEmpresaTelefono,
            tutorEmpresaCorreo: p.tutorEmpresaCorreo,
            observaciones: p.observaciones,
          })),
        }))}
      />
      </Suspense>
    </div>
  );
}
