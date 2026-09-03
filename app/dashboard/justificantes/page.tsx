import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";
import { JustificantesClient } from "./JustificantesClient";
import { obtenerAlumnosParaJustificantes, obtenerProfesoresParaFiltroJustificantes, obtenerProfesoresParaAvisar } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TITULO = "Justificantes Ausencia";
const SUBTITULO = "Consulta y gestiona los justificantes de ausencia de los alumnos.";

export default async function JustificantesPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const userId = session?.user.id ?? "";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const isEquipoDirectivo = role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION" || role === "DIRECCION";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "justificantes" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={TITULO} subtitle={SUBTITULO} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              Ningún centro tiene activado el módulo de Justificantes Ausencia todavía.
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/justificantes" />
          )}
        </div>
      );
    }

    const [alumnos, profesoresFiltro, profesoresAvisar] = await Promise.all([
      obtenerAlumnosParaJustificantes(searchParams.school),
      obtenerProfesoresParaFiltroJustificantes(searchParams.school),
      obtenerProfesoresParaAvisar(searchParams.school),
    ]);

    return (
      <div>
        <DashboardHeader title={TITULO} subtitle={SUBTITULO} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/justificantes" />
        <JustificantesClient alumnos={alumnos} profesoresFiltro={profesoresFiltro} profesoresAvisar={profesoresAvisar} currentUserId={userId} esDirectivo schoolId={searchParams.school} />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title={TITULO} subtitle={SUBTITULO} userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });
  if (!school?.modules.includes("justificantes")) {
    return (
      <div>
        <DashboardHeader title={TITULO} subtitle={SUBTITULO} userName={userName} role={role} />
        <ModuleLocked moduleName="Justificantes Ausencia" />
      </div>
    );
  }

  const [alumnos, profesoresFiltro, profesoresAvisar] = await Promise.all([
    obtenerAlumnosParaJustificantes(schoolId),
    isEquipoDirectivo ? obtenerProfesoresParaFiltroJustificantes(schoolId) : Promise.resolve([]),
    obtenerProfesoresParaAvisar(schoolId),
  ]);

  return (
    <div>
      <DashboardHeader title={TITULO} subtitle={SUBTITULO} userName={userName} role={role} notificationCount={0} />
      <JustificantesClient alumnos={alumnos} profesoresFiltro={profesoresFiltro} profesoresAvisar={profesoresAvisar} currentUserId={userId} esDirectivo={isEquipoDirectivo} schoolId={schoolId} />
    </div>
  );
}
