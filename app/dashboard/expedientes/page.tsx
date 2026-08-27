import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { ExpedientesClient } from "./ExpedientesClient";
import { ExpedientesFormalesClient } from "./ExpedientesFormalesClient";
import { ExpulsionesClient } from "./ExpulsionesClient";
import { obtenerAlumnosEnProcesoExpulsion, obtenerAlumnosConTresIncidenciasSinExpediente } from "@/lib/disciplinaHelpers";
import { DisciplinaTabs } from "./DisciplinaTabs";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getExpedientesData(schoolId: string, soloPropiasDeUserId?: string) {
  const [incidenciasRaw, alumnosRaw, profesoresRaw] = await Promise.all([
    prisma.incidencia.findMany({
      where: {
        schoolId,
        ...(soloPropiasDeUserId
          ? { OR: [{ creadorId: soloPropiasDeUserId }, { tutorId: soloPropiasDeUserId }] }
          : {}),
      },
      include: {
        alumno: { select: { id: true, nombre: true, curso: true, avatarUrl: true } },
        creador: { select: { name: true, email: true } },
        tutor: { select: { id: true, name: true, email: true } },
        eventos: { orderBy: { createdAt: "asc" }, include: { autor: { select: { name: true, email: true } } } },
        expedientes: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.alumno.findMany({
      where: { schoolId },
      select: { id: true, nombre: true, curso: true, avatarUrl: true, profesorId: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = incidenciasRaw.map((inc) => ({
    id: inc.id,
    alumnoId: inc.alumnoId,
    alumnoNombre: inc.alumno.nombre,
    alumnoCurso: inc.alumno.curso,
    alumnoAvatarUrl: inc.alumno.avatarUrl,
    creadorId: inc.creadorId,
    creadorNombre: inc.creador.name ?? inc.creador.email,
    tutorId: inc.tutorId,
    tutorNombre: inc.tutor.name ?? inc.tutor.email,
    tipoIncidencia: inc.tipoIncidencia,
    prioridad: inc.prioridad,
    estado: inc.estado,
    fecha: inc.fecha.toISOString(),
    lugar: inc.lugar,
    descripcion: inc.descripcion,
    observaciones: inc.observaciones,
    medidasAplicadas: inc.medidasAplicadas,
    familiaInformada: inc.familiaInformada,
    familiaInformadaFecha: inc.familiaInformadaFecha?.toISOString() ?? null,
    familiaInformadaComunicacion: inc.familiaInformadaComunicacion,
    createdAt: inc.createdAt.toISOString(),
    expedientes: inc.expedientes.map((e) => ({
      id: e.id,
      numero: e.numero,
      estado: e.estado,
      fechaInicio: e.fechaInicio.toISOString(),
      fets: e.fets,
      testimonis: e.testimonis,
      informeTutor: e.informeTutor,
      audienciaResumen: e.audienciaResumen,
      valoracionComision: e.valoracionComision,
      medidasProvisionales: e.medidasProvisionales,
      sancionDias: e.sancionDias,
      sancionMotivo: e.sancionMotivo,
      fechaAplicacionInicio: e.fechaAplicacionInicio.toISOString(),
      fechaAplicacionFin: e.fechaAplicacionFin.toISOString(),
      recursoEstado: e.recursoEstado,
      direccionNombre: e.direccionNombre,
      coordinadorNombre: e.coordinadorNombre,
      enviadoEn: e.enviadoEn?.toISOString() ?? null,
    })),
    eventos: inc.eventos.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      descripcion: e.descripcion,
      autorNombre: e.autor?.name ?? e.autor?.email ?? "Sistema",
      createdAt: e.createdAt.toISOString(),
    })),
  }));

  const alumnos = alumnosRaw.map((a) => ({ id: a.id, nombre: a.nombre, curso: a.curso, avatarUrl: a.avatarUrl, profesorId: a.profesorId }));
  const profesores = profesoresRaw.map((p) => ({ id: p.id, name: p.name ?? p.email }));

  // La pestaña "Expedients" es la misma información, solo que aplanada:
  // un expediente por fila, con los datos de su incidencia y alumno ya
  // incluidos, en vez de anidados dentro de la incidencia.
  const expedientesFormales = rows.flatMap((inc) =>
    inc.expedientes.map((e) => ({
      ...e,
      alumnoId: inc.alumnoId,
      alumnoNombre: inc.alumnoNombre,
      alumnoCurso: inc.alumnoCurso,
      tutorNombre: inc.tutorNombre,
      incidenciaId: inc.id,
      incidenciaDescripcion: inc.descripcion,
      createdAt: inc.createdAt,
    }))
  );

  return { rows, alumnos, profesores, expedientesFormales };
}

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: { school?: string; vista?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const userId = session?.user.id ?? "";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const isEquipoDirectivo = role === "COORDINADOR" || role === "ADMIN_CENTRO";
  const vista =
    searchParams.vista === "expedientes" ? "expedientes" : searchParams.vista === "expulsiones" ? "expulsiones" : "incidencias";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "expedientes" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "expedientes.title")} subtitle={translate(locale, "expedientes.subtitle")} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              {translate(locale, "expedientes.ningunCentro")}
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/expedientes" />
          )}
        </div>
      );
    }

    const { rows, alumnos, profesores, expedientesFormales } = await getExpedientesData(searchParams.school);
    const alumnosExpulsion = vista === "expulsiones" ? await obtenerAlumnosEnProcesoExpulsion(searchParams.school) : [];
    const pendientesRevision = vista === "expedientes" ? await obtenerAlumnosConTresIncidenciasSinExpediente(searchParams.school) : [];
    return (
      <div>
        <DashboardHeader title={translate(locale, "expedientes.title")} subtitle={translate(locale, "expedientes.subtitle")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/expedientes" />
        <DisciplinaTabs vista={vista} />
        {vista === "incidencias" ? (
          <ExpedientesClient rows={rows} alumnos={alumnos} profesores={profesores} currentUserId={userId} esDirectivo />
        ) : vista === "expedientes" ? (
          <ExpedientesFormalesClient
            expedientes={expedientesFormales.map((e) => ({ ...e, esDirectivo: true }))}
            alumnos={alumnos}
            profesores={profesores}
            pendientesRevision={pendientesRevision}
          />
        ) : (
          <ExpulsionesClient alumnos={alumnosExpulsion} />
        )}
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "expedientes.title")} subtitle={translate(locale, "expedientes.subtitle")} userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });
  if (!school?.modules.includes("expedientes")) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "expedientes.title")} subtitle={translate(locale, "expedientes.subtitle")} userName={userName} role={role} />
        <ModuleLocked moduleName={translate(locale, "expedientes.title")} />
      </div>
    );
  }

  const { rows, alumnos, profesores, expedientesFormales } = await getExpedientesData(schoolId, isEquipoDirectivo ? undefined : userId);
  const alumnosExpulsion = vista === "expulsiones" ? await obtenerAlumnosEnProcesoExpulsion(schoolId) : [];
  const pendientesRevision = vista === "expedientes" ? await obtenerAlumnosConTresIncidenciasSinExpediente(schoolId) : [];

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "expedientes.title")}
        subtitle={translate(locale, "expedientes.subtitle")}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <DisciplinaTabs vista={vista} />
      {vista === "incidencias" ? (
        <ExpedientesClient rows={rows} alumnos={alumnos} profesores={profesores} currentUserId={userId} esDirectivo={isEquipoDirectivo} />
      ) : vista === "expedientes" ? (
        <ExpedientesFormalesClient
          expedientes={expedientesFormales.map((e) => ({ ...e, esDirectivo: isEquipoDirectivo }))}
          alumnos={alumnos}
          profesores={profesores}
          pendientesRevision={pendientesRevision}
        />
      ) : (
        <ExpulsionesClient alumnos={alumnosExpulsion} />
      )}
    </div>
  );
}
