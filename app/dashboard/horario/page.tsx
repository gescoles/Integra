import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { ModuleLocked } from "../components/ModuleLocked";
import { translate } from "../i18n";
import { HorarioClient } from "./HorarioClient";
import { SchoolPicker } from "../components/SchoolPicker";
import Link from "next/link";
import { Landmark, UserRound } from "lucide-react";

export default async function HorarioPage({
  searchParams,
}: {
  searchParams: { school?: string; user?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";

  if (!session?.user.id) {
    return null;
  }

  const isSuperAdmin = session.user.role === "SUPERADMIN";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "horario.title")} subtitle={translate(locale, "horario.subtitle")} userName={session.user.name ?? ""} role="SUPERADMIN" />
          <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/horario" />
        </div>
      );
    }

    if (!searchParams.user) {
      const usuarios = await prisma.user.findMany({
        where: { schoolId: searchParams.school, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
      return (
        <div>
          <DashboardHeader title={translate(locale, "horario.title")} subtitle={translate(locale, "horario.subtitle")} userName={session.user.name ?? ""} role="SUPERADMIN" />
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <UserRound className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h3 className="mb-1 text-sm font-bold text-[#0B1D4D]">Elige un usuario</h3>
            <p className="mb-5 text-xs text-slate-400">Verás su horario en modo lectura.</p>
            <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
              {usuarios.map((u) => (
                <Link
                  key={u.id}
                  href={`/dashboard/horario?school=${searchParams.school}&user=${u.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-[#2F6FED] hover:text-[#2F6FED]"
                >
                  {u.name ?? u.email}
                </Link>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const bloques = await prisma.horarioBloque.findMany({
      where: { profesorId: searchParams.user },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
    });

    return (
      <div>
        <DashboardHeader title={translate(locale, "horario.title")} subtitle={translate(locale, "horario.viendoHorarioUsuario")} userName={session.user.name ?? ""} role="SUPERADMIN" />
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <Landmark className="h-4 w-4 text-[#2F6FED]" />
          <span className="text-xs font-semibold text-slate-500">{translate(locale, "modoSupervision")}</span>
          <Link href="/dashboard/horario" className="ml-auto text-xs font-semibold text-[#2F6FED] hover:underline">
            {translate(locale, "cambiarCentroUsuario")}
          </Link>
        </div>
        <HorarioClient bloques={bloques} readOnly />
      </div>
    );
  }

  const school = session.user.schoolId
    ? await prisma.school.findUnique({ where: { id: session.user.schoolId }, select: { modules: true } })
    : null;

  if (!school?.modules.includes("utilidades")) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "horario.title")}
          subtitle={translate(locale, "horario.subtitle")}
          notificationCount={0}
        />
        <ModuleLocked moduleName={translate(locale, "nav.utilidades")} />
      </div>
    );
  }

  const bloques = await prisma.horarioBloque.findMany({
    where: { profesorId: session.user.id },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "horario.title")}
        subtitle={translate(locale, "horario.subtitle")}
        notificationCount={0}
      />
      <HorarioClient bloques={bloques} />
    </div>
  );
}
