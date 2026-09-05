import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { ModuleLocked } from "../components/ModuleLocked";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";
import { SugerenciasClient } from "./SugerenciasClient";
import { obtenerSugerencias, obtenerDepartamentosParaSugerencia } from "./actions";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

export default async function SugerenciasPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const puedeVerTodas = esDirectivo(role);

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "utilidades" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title="Sugerencias del profesorado" subtitle="Sugerencias anónimas para mejorar el centro." userName={userName} role="SUPERADMIN" />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              Ningún centro tiene el módulo de Utilidades contratado todavía.
            </div>
          ) : (
            <SchoolPicker schools={schools} locale="ES" basePath="/dashboard/sugerencias" />
          )}
        </div>
      );
    }

    const schoolId = searchParams.school;
    const [sugerencias, departamentos] = await Promise.all([
      obtenerSugerencias(schoolId),
      obtenerDepartamentosParaSugerencia(schoolId),
    ]);

    return (
      <div>
        <DashboardHeader title="Sugerencias del profesorado" subtitle="Sugerencias anónimas para mejorar el centro." userName={userName} role="SUPERADMIN" />
        <SchoolSwitcher schools={schools} currentSchoolId={schoolId} locale="ES" basePath="/dashboard/sugerencias" />
        <SugerenciasClient sugerencias={sugerencias} departamentos={departamentos} esDirectivo schoolId={schoolId} />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title="Sugerencias del profesorado" subtitle="Sugerencias anónimas para mejorar el centro." userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario no tiene un centro asignado todavía.
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });
  if (!school?.modules.includes("utilidades")) {
    return (
      <div>
        <DashboardHeader title="Sugerencias del profesorado" subtitle="Sugerencias anónimas para mejorar el centro." userName={userName} role={role} />
        <ModuleLocked moduleName="Utilidades" />
      </div>
    );
  }

  const [sugerencias, departamentos] = await Promise.all([
    obtenerSugerencias(),
    obtenerDepartamentosParaSugerencia(),
  ]);

  return (
    <div>
      <DashboardHeader
        title="Sugerencias del profesorado"
        subtitle={
          puedeVerTodas
            ? "Sugerencias anónimas de todo el centro para mejorar."
            : "Envía sugerencias anónimas para mejorar el centro y consulta las que has enviado."
        }
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <SugerenciasClient sugerencias={sugerencias} departamentos={departamentos} esDirectivo={puedeVerTodas} />
    </div>
  );
}
