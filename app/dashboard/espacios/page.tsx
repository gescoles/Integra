import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { EspaciosClient } from "./EspaciosClient";
import { SembrarPlanoButton } from "./AdminPlano";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPlantasData(schoolId: string) {
  const plantasRaw = await prisma.espacioPlanta.findMany({
    where: { schoolId },
    include: {
      aulas: {
        include: {
          reservas: {
            include: { user: { select: { name: true, email: true } } },
            orderBy: { fecha: "asc" },
          },
        },
      },
    },
    orderBy: { numero: "desc" },
  });

  const usuariosRaw = await prisma.user.findMany({
    where: { schoolId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const plantas = plantasRaw.map((p) => ({
    id: p.id,
    numero: p.numero,
    nombre: p.nombre,
    aulas: p.aulas.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      x: a.x,
      z: a.z,
      ancho: a.ancho,
      profundo: a.profundo,
      alto: a.alto,
      color: a.color,
      reservas: a.reservas.map((r) => ({
        id: r.id,
        fecha: r.fecha.toISOString(),
        horaInicio: r.horaInicio,
        horaFin: r.horaFin,
        userNombre: r.user.name ?? r.user.email,
        userId: r.userId,
      })),
    })),
  }));

  const usuarios = usuariosRaw.map((u) => ({ id: u.id, name: u.name ?? u.email }));

  return { plantas, usuarios };
}

export default async function EspaciosPage({
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
  const isEquipoDirectivo = role === "COORDINADOR" || role === "ADMIN_CENTRO";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "espacios.title")} subtitle={translate(locale, "espacios.subtitle")} userName={userName} role={role} />
          <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/espacios" />
        </div>
      );
    }

    const { plantas, usuarios } = await getPlantasData(searchParams.school);
    return (
      <div>
        <DashboardHeader title={translate(locale, "espacios.title")} subtitle={translate(locale, "espacios.subtitle")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/espacios" />
        <SembrarPlanoButton schoolId={searchParams.school} sinPlantas={plantas.length === 0} />
        <EspaciosClient plantas={plantas} currentUserId={userId} esDirectivo isSuperAdmin usuarios={usuarios} schoolId={searchParams.school} />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "espacios.title")} subtitle={translate(locale, "espacios.subtitle")} userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });
  if (!school?.modules.includes("espacios")) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "espacios.title")} subtitle={translate(locale, "espacios.subtitle")} userName={userName} role={role} />
        <ModuleLocked moduleName={translate(locale, "espacios.title")} />
      </div>
    );
  }

  const { plantas, usuarios } = await getPlantasData(schoolId);

  return (
    <div>
      <DashboardHeader title={translate(locale, "espacios.title")} subtitle={translate(locale, "espacios.subtitle")} userName={userName} role={role} notificationCount={0} />
      <EspaciosClient plantas={plantas} currentUserId={userId} esDirectivo={isEquipoDirectivo} isSuperAdmin={false} usuarios={usuarios} schoolId={schoolId} />
    </div>
  );
}
