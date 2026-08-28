import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { MaterialClient } from "./MaterialClient";
import { MaterialFormModal } from "./MaterialFormModal";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";

async function getMaterialForSchool(schoolId: string) {
  const materialRaw = await prisma.materialRequest.findMany({
    where: { schoolId },
    include: { profesor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return materialRaw.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    curso: m.curso,
    asignatura: m.asignatura,
    cantidad: m.cantidad,
    precioUnidad: m.precioUnidad,
    proveedor: m.proveedor,
    enlace: m.enlace,
    categoria: m.categoria,
    estado: m.estado,
    justificacion: m.justificacion,
    profesorId: m.profesorId,
    profesorName: m.profesor?.name ?? m.profesor?.email ?? "—",
  }));
}

export default async function MaterialPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const isCoordinacion = role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";

  // SuperAdmin: elige cualquier centro y ve/gestiona TODO su material.
  // Coordinación/Dirección: ve TODO el material de su propio centro (de
  // todos los profesores), con filtros por curso/ciclo y por profesor.
  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "material" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "material.title")} subtitle={translate(locale, "material.subtitle.superadmin")} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              {translate(locale, "material.ningunCentro")}
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/material" />
          )}
        </div>
      );
    }

    const rows = await getMaterialForSchool(searchParams.school);

    return (
      <div>
        <DashboardHeader title={translate(locale, "material.title")} subtitle={translate(locale, "material.subtitle.superadmin")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/material" />
        <MaterialClient rows={rows} currentUserId={session!.user.id} canManageAll schoolId={searchParams.school} showFilters />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  const userId = session?.user.id;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "material.title")}
          subtitle={translate(locale, "material.subtitle.centro")}
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { modules: true },
  });

  if (!school?.modules.includes("material")) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "material.title")}
          subtitle={translate(locale, "material.subtitle.centro")}
          userName={userName}
          role={role}
        />
        <ModuleLocked moduleName={translate(locale, "material.title")} />
      </div>
    );
  }

  if (!userId) return null;

  // Coordinación/Dirección ven todo el material del centro; el resto
  // (Profesor) solo ve y gestiona lo que ha pedido él mismo.
  const allRows = await getMaterialForSchool(schoolId);
  const rows = isCoordinacion ? allRows : allRows.filter((m) => m.profesorId === userId);

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "material.title")}
        subtitle={translate(locale, "material.subtitle.centro")}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <div className="mb-5 flex justify-end">
        <MaterialFormModal userName={userName} />
      </div>
      <MaterialClient
        rows={rows}
        currentUserId={userId}
        canManageAll={isCoordinacion}
        schoolId={schoolId}
        showFilters={isCoordinacion}
      />
    </div>
  );
}
