import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { GuardiasClient } from "./GuardiasClient";
import { GuardiaFormModal } from "./GuardiaFormModal";
import { CoberturaWizard } from "./CoberturaWizard";
import { SolicitudesPendientes } from "./SolicitudesPendientes";
import { AvisarAusenciaForm } from "./AvisarAusenciaForm";
import { MisCoberturas } from "./MisCoberturas";
import { obtenerSolicitudesPendientes } from "./actions";
import { GuardiasTabs } from "./GuardiasTabs";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";

async function getGuardiasCentro(schoolId: string) {
  const [guardiasRaw, coberturasRaw, profesoresRaw] = await Promise.all([
    prisma.guardia.findMany({
      where: { schoolId },
      include: { profesor: { select: { id: true, name: true } } },
      orderBy: { fecha: "desc" },
    }),
    // Las guardias ya resueltas a través del sistema de avisos de
    // ausencia (CoberturaGuardia) también cuentan como "programadas": es
    // el sustituto quien tiene la guardia en su agenda.
    prisma.coberturaGuardia.findMany({
      where: { schoolId, estado: "ASIGNADA" },
      include: {
        profesorSustituto: { select: { id: true, name: true } },
        profesorAusente: { select: { name: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rowsGuardia = guardiasRaw.map((g) => ({
    id: g.id,
    turno: g.turno ?? "",
    ubicacion: g.ubicacion,
    grupo: g.grupo,
    tarea: g.tarea,
    status: g.status,
    fecha: g.fecha.toISOString(),
    profesorId: g.profesorId,
    profesorName: g.profesor?.name ?? "—",
    origen: "guardia" as const,
  }));

  const rowsCobertura = coberturasRaw
    .filter((c) => c.profesorSustituto)
    .map((c) => ({
      id: c.id,
      turno: `${c.horaInicio}–${c.horaFin}`,
      ubicacion: c.ubicacion,
      grupo: c.grupo,
      tarea: `Cubre a ${c.profesorAusente?.name ?? "otro profesor"}${c.trabajoAlumnos ? `: ${c.trabajoAlumnos}` : ""}`,
      status: "CUBIERTA",
      fecha: c.fecha.toISOString(),
      profesorId: c.profesorSustituto!.id,
      profesorName: c.profesorSustituto!.name ?? "—",
      origen: "cobertura" as const,
    }));

  const rows = [...rowsGuardia, ...rowsCobertura].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const profesores = profesoresRaw.map((p) => ({ id: p.id, name: p.name ?? p.email }));
  return { rows, profesores };
}

// Datos para el asistente de cobertura: el horario semanal de cada
// profesor (lo rellenan ellos mismos en "Mi horario") y quién está de
// guardia programada cada día/hora, para poder cruzar ambas cosas.
async function getDatosCobertura(schoolId: string) {
  const [horarios, guardias] = await Promise.all([
    prisma.horarioBloque.findMany({
      where: { profesor: { schoolId } },
      select: { id: true, profesorId: true, diaSemana: true, horaInicio: true, horaFin: true, asignatura: true, grupo: true, esGuardia: true },
    }),
    prisma.guardia.findMany({
      where: { schoolId, status: { in: ["PROGRAMADA", "PENDIENTE"] } },
      select: { profesorId: true, fecha: true, turno: true, ubicacion: true },
    }),
  ]);

  return {
    horarios,
    guardias: guardias.map((g) => ({
      profesorId: g.profesorId,
      fecha: g.fecha.toISOString(),
      turno: g.turno ?? "",
      ubicacion: g.ubicacion,
    })),
  };
}

export default async function GuardiasPage({
  searchParams,
}: {
  searchParams: { school?: string; vista?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";

  // SuperAdmin: elige cualquier centro para supervisarlo
  if (role === "SUPERADMIN") {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "guardias" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "guardias.title")} subtitle={translate(locale, "guardias.subtitle.superadmin")} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              Ningún centro tiene el módulo de Guardias contratado todavía.
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/guardias" />
          )}
        </div>
      );
    }

    const { rows, profesores } = await getGuardiasCentro(searchParams.school);
    const { horarios, guardias } = await getDatosCobertura(searchParams.school);
    const solicitudes = await obtenerSolicitudesPendientes(searchParams.school);
    const vistaSuperAdmin = searchParams.vista ?? "solicitudes";
    return (
      <div>
        <DashboardHeader title={translate(locale, "guardias.title")} subtitle={translate(locale, "guardias.subtitle.superadmin")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/guardias" />
        <Suspense fallback={null}>
          <GuardiasTabs schoolId={searchParams.school} />
        </Suspense>

        {vistaSuperAdmin === "planificacion" ? (
          <>
            <MisCoberturas modo="buscador" schoolId={searchParams.school} />
            <CoberturaWizard schoolId={searchParams.school} profesores={profesores} horarios={horarios} guardias={guardias} />
            <div className="mb-5 mt-8 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0B1D4D]">{translate(locale, "guardias.programadas")}</h2>
              <GuardiaFormModal schoolId={searchParams.school} profesores={profesores} />
            </div>
            <GuardiasClient rows={rows} profesores={profesores} />
          </>
        ) : (
          <Suspense fallback={null}>
            <SolicitudesPendientes solicitudes={solicitudes} profesores={profesores} guardias={guardias} horarios={horarios} />
          </Suspense>
        )}
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "guardias.title")}
          subtitle={translate(locale, "guardias.subtitle.centro")}
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario no tiene un centro asignado todavía.
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { modules: true },
  });

  if (!school?.modules.includes("guardias")) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "guardias.title")}
          subtitle={translate(locale, "guardias.subtitle.centro")}
          userName={userName}
          role={role}
        />
        <ModuleLocked moduleName="Guardias" />
      </div>
    );
  }

  const isProfesor = role === "PROFESOR";
  const userId = session?.user.id;
  const subtitle = isProfesor
    ? "Consulta tus propias guardias."
    : "Planifica y consulta las guardias de todo el centro.";

  // Para dirección/coordinación: mismo origen de datos que usa el
  // SuperAdmin (getGuardiasCentro), que combina las guardias puntuales
  // ("+ Nueva guardia") CON las coberturas ya asignadas desde el aviso de
  // ausencia de un profesor. Antes esta rama solo miraba las puntuales, así
  // que las guardias resueltas por el flujo de "avisar ausencia" nunca
  // aparecían aquí aunque sí se hubieran asignado correctamente.
  const { rows, profesores } = !isProfesor
    ? await getGuardiasCentro(schoolId)
    : { rows: [] as Awaited<ReturnType<typeof getGuardiasCentro>>["rows"], profesores: [] as Awaited<ReturnType<typeof getGuardiasCentro>>["profesores"] };

  const { horarios, guardias } = !isProfesor
    ? await getDatosCobertura(schoolId)
    : { horarios: [], guardias: [] };

  const solicitudes = !isProfesor ? await obtenerSolicitudesPendientes() : [];

  // El horario propio (para poder avisar de una ausencia) lo necesita
  // cualquiera con sesión, no solo un Profesor — Coordinación/Dirección
  // también dan clase y también pueden faltar algún día.
  const miHorario = userId
    ? await prisma.horarioBloque.findMany({
        where: { profesorId: userId },
        select: { id: true, diaSemana: true, horaInicio: true, horaFin: true, asignatura: true, grupo: true, aula: true, esGuardia: true },
        orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
      })
    : [];

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "guardias.title")}
        subtitle={subtitle}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      {!isProfesor && (
        <Suspense fallback={null}>
          <GuardiasTabs schoolId={searchParams.school} />
        </Suspense>
      )}

      {(() => {
        const vista = isProfesor ? "pedir" : (searchParams.vista ?? "solicitudes");

        if (vista === "pedir") {
          return (
            <>
              <div className="mb-8">
                <AvisarAusenciaForm miHorario={miHorario} />
              </div>
              <MisCoberturas modo="propio" />
            </>
          );
        }

        if (vista === "planificacion" && !isProfesor) {
          return (
            <>
              {role === "COORDINADOR" && <MisCoberturas modo="buscador" schoolId={schoolId} />}
              <CoberturaWizard schoolId={schoolId} profesores={profesores} horarios={horarios} guardias={guardias} />
              <div className="mb-5 mt-8 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#0B1D4D]">{translate(locale, "guardias.programadas")}</h2>
                <GuardiaFormModal schoolId={schoolId} profesores={profesores} />
              </div>
              <GuardiasClient rows={rows} profesores={profesores} />
            </>
          );
        }

        // "solicitudes" — la vista por defecto para Coordinación/Dirección.
        return (
          <Suspense fallback={null}>
            <SolicitudesPendientes solicitudes={solicitudes} profesores={profesores} guardias={guardias} horarios={horarios} />
          </Suspense>
        );
      })()}
    </div>
  );
}
