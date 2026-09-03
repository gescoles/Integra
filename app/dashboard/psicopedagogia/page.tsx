import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";
import { PsicopedagogiaClient } from "./PsicopedagogiaClient";
import {
  obtenerAlumnosPIDelCentro,
  obtenerPsicopedagogaDelCentro,
  obtenerProfesoresParaPsicopedagoga,
  obtenerAlumnosDelCentro,
  obtenerDirectorPIEmail,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PsicopedagogiaPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const userId = session?.user.id ?? "";
  const userEmail = session?.user.email ?? "";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const isEquipoDirectivo = role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION" || role === "DIRECCION";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "psicopedagogia" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title="Psicopedagogia" subtitle="Gestión de los PI del centro" userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              Ningún centro tiene activado el módulo de Psicopedagogia todavía.
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/psicopedagogia" />
          )}
        </div>
      );
    }

    const [alumnosPI, psicopedagogaActual, profesoresParaPsico, alumnosDelCentro, directorPIEmail, schoolElegido] = await Promise.all([
      obtenerAlumnosPIDelCentro(),
      obtenerPsicopedagogaDelCentro(searchParams.school),
      obtenerProfesoresParaPsicopedagoga(searchParams.school),
      obtenerAlumnosDelCentro(),
      obtenerDirectorPIEmail(searchParams.school),
      prisma.school.findUnique({ where: { id: searchParams.school }, select: { cursoAcademico: true } }),
    ]);

    return (
      <div>
        <DashboardHeader title="Psicopedagogia" subtitle="Gestión de los PI del centro" userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/psicopedagogia" />
        <PsicopedagogiaClient
          schoolId={searchParams.school}
          alumnosPI={alumnosPI}
          alumnosDelCentro={alumnosDelCentro}
          currentUserId={userId}
          esPsicopedagoga={psicopedagogaActual?.id === userId}
          esDirectivo
          esDirectorFijo={Boolean(directorPIEmail) && userEmail === directorPIEmail}
          isSuperAdmin
          psicopedagogaActual={psicopedagogaActual}
          profesoresParaPsico={profesoresParaPsico}
          directorPIEmailActual={directorPIEmail}
          cursoAcademicoCentro={schoolElegido?.cursoAcademico ?? ""}
        />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title="Psicopedagogia" subtitle="Gestión de los PI del centro" userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true, cursoAcademico: true } });
  if (!school?.modules.includes("psicopedagogia")) {
    return (
      <div>
        <DashboardHeader title="Psicopedagogia" subtitle="Gestión de los PI del centro" userName={userName} role={role} />
        <ModuleLocked moduleName="Psicopedagogia" />
      </div>
    );
  }

  const [alumnosPI, psicopedagogaActual, alumnosDelCentro, directorPIEmail, profesoresParaPsico] = await Promise.all([
    obtenerAlumnosPIDelCentro(),
    obtenerPsicopedagogaDelCentro(schoolId),
    obtenerAlumnosDelCentro(),
    obtenerDirectorPIEmail(schoolId),
    obtenerProfesoresParaPsicopedagoga(schoolId),
  ]);

  return (
    <div>
      <DashboardHeader title="Psicopedagogia" subtitle="Gestión de los PI del centro" userName={userName} role={role} notificationCount={0} />
      <PsicopedagogiaClient
        schoolId={schoolId}
        alumnosPI={alumnosPI}
        alumnosDelCentro={alumnosDelCentro}
        currentUserId={userId}
        esPsicopedagoga={psicopedagogaActual?.id === userId}
        esDirectivo={isEquipoDirectivo}
        esDirectorFijo={Boolean(directorPIEmail) && userEmail === directorPIEmail}
        isSuperAdmin={false}
        psicopedagogaActual={psicopedagogaActual}
        profesoresParaPsico={profesoresParaPsico}
        directorPIEmailActual={directorPIEmail}
        cursoAcademicoCentro={school.cursoAcademico ?? ""}
      />
    </div>
  );
}
