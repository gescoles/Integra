import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { OnboardingClient } from "./OnboardingClient";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCarpetas(schoolId: string) {
  const carpetasRaw = await prisma.onboardingCarpeta.findMany({
    where: { schoolId },
    include: {
      creadoPor: { select: { name: true, email: true } },
      archivos: {
        include: { subidoPor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return carpetasRaw.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    creadoPorNombre: c.creadoPor?.name ?? c.creadoPor?.email ?? null,
    createdAt: c.createdAt.toISOString(),
    archivos: c.archivos.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      url: a.url,
      tipo: a.tipo,
      tamano: a.tamano,
      subidoPorNombre: a.subidoPor?.name ?? a.subidoPor?.email ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  }));
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const esDirectivo = role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "onboarding" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "onboarding.title")} subtitle={translate(locale, "onboarding.subtitle")} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              {translate(locale, "onboarding.ningunCentro")}
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/onboarding" />
          )}
        </div>
      );
    }

    const carpetas = await getCarpetas(searchParams.school);
    return (
      <div>
        <DashboardHeader title={translate(locale, "onboarding.title")} subtitle={translate(locale, "onboarding.subtitle")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/onboarding" />
        <OnboardingClient carpetas={carpetas} esDirectivo schoolId={searchParams.school} />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "onboarding.title")} subtitle={translate(locale, "onboarding.subtitle")} userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });
  if (!school?.modules.includes("onboarding")) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "onboarding.title")} subtitle={translate(locale, "onboarding.subtitle")} userName={userName} role={role} />
        <ModuleLocked moduleName={translate(locale, "onboarding.title")} />
      </div>
    );
  }

  const carpetas = await getCarpetas(schoolId);

  return (
    <div>
      <DashboardHeader title={translate(locale, "onboarding.title")} subtitle={translate(locale, "onboarding.subtitle")} userName={userName} role={role} notificationCount={0} />
      <OnboardingClient carpetas={carpetas} esDirectivo={esDirectivo} schoolId={schoolId} />
    </div>
  );
}
