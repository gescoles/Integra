import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { EmpresasClient } from "./EmpresasClient";
import { obtenerEmpresas } from "./actions";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const puedeEditar =
    role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "empresas" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title="Empresas" subtitle="Empresas colaboradoras de prácticas de todos los centros" userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              Ningún centro tiene este módulo contratado todavía.
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/empresas" />
          )}
        </div>
      );
    }

    const empresas = await obtenerEmpresas(searchParams.school);
    return (
      <div>
        <DashboardHeader title="Empresas" subtitle="Empresas colaboradoras de prácticas" userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/empresas" />
        <EmpresasClient empresas={empresas} puedeEditar={puedeEditar} schoolId={searchParams.school} />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title="Empresas" subtitle="Empresas colaboradoras de prácticas" userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });
  if (!school?.modules.includes("empresas")) {
    return (
      <div>
        <DashboardHeader title="Empresas" subtitle="Empresas colaboradoras de prácticas" userName={userName} role={role} />
        <ModuleLocked moduleName="Empresas" />
      </div>
    );
  }

  const empresas = await obtenerEmpresas(schoolId);

  return (
    <div>
      <DashboardHeader title="Empresas" subtitle="Consulta, filtra y gestiona todas las empresas donde el alumnado puede realizar prácticas." userName={userName} role={role} />
      <EmpresasClient empresas={empresas} puedeEditar={puedeEditar} />
    </div>
  );
}
