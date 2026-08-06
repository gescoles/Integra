import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { SalidasClient } from "./SalidasClient";
import { SalidaFormModal } from "./SalidaFormModal";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";

// El estado de cada salida (pendiente/aprobada/rechazada) cambia en
// cualquier momento desde Aprobaciones, así que evitamos cualquier caché
// aquí también.
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSalidasData(schoolId: string, soloDe?: string) {
  const [salidasRaw, profesoresRaw] = await Promise.all([
    prisma.salida.findMany({
      where: { schoolId, ...(soloDe ? { creadoPorId: soloDe } : {}) },
      include: {
        responsable: { select: { id: true, name: true, email: true } },
        creadoPor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const profesores = profesoresRaw.map((p) => ({ id: p.id, name: p.name ?? p.email }));
  const profesoresMap = new Map(profesores.map((p) => [p.id, p.name]));

  const rows = salidasRaw.map((s) => ({
    id: s.id,
    curso: s.curso,
    tipo: s.tipo,
    actividad: s.actividad,
    fecha: s.fecha.toISOString(),
    horaSalida: s.horaSalida,
    horaVuelta: s.horaVuelta,
    vueltaDirectaCasa: s.vueltaDirectaCasa,
    responsableId: s.responsableId,
    responsableName: s.responsable?.name ?? s.responsable?.email ?? "—",
    profesoresNombres: s.profesoresIds.map((id) => profesoresMap.get(id) ?? "—"),
    numAlumnos: s.numAlumnos,
    costo: s.costo,
    moneda: s.moneda,
    observaciones: s.observaciones,
    estado: s.estado,
    creadoPorId: s.creadoPorId,
    creadoPorNombre: s.creadoPor?.name ?? s.creadoPor?.email ?? "—",
  }));

  return { rows, profesores };
}

export default async function SalidasPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const isEquipoDirectivo = role === "COORDINADOR" || role === "ADMIN_CENTRO";
  const isProfesor = role === "PROFESOR";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "salidas" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "salidas.title")} subtitle={translate(locale, "salidas.subtitle.superadmin")} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              {translate(locale, "salidas.ningunCentro")}
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/salidas" />
          )}
        </div>
      );
    }

    const { rows, profesores } = await getSalidasData(searchParams.school);
    return (
      <div>
        <DashboardHeader title={translate(locale, "salidas.title")} subtitle={translate(locale, "salidas.subtitle.superadmin")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/salidas" />
        <SalidasClient rows={rows} profesores={profesores} currentUserId={session!.user.id} canManageAll showFilters schoolId={searchParams.school} />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  const userId = session?.user.id;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "salidas.title")} subtitle={translate(locale, "salidas.subtitle.centro")} userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });

  if (!school?.modules.includes("salidas")) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "salidas.title")} subtitle={translate(locale, "salidas.subtitle.centro")} userName={userName} role={role} />
        <ModuleLocked moduleName={translate(locale, "salidas.title")} />
      </div>
    );
  }

  if (!userId) return null;

  // El equipo directivo ve todas las salidas del centro; el profesor solo
  // ve (y gestiona) las que ha creado él mismo.
  const { rows, profesores } = await getSalidasData(schoolId, isProfesor ? userId : undefined);

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "salidas.title")}
        subtitle={isProfesor ? translate(locale, "salidas.subtitle.profesor") : translate(locale, "salidas.subtitle.centro")}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      {isProfesor && (
        <div className="mb-5 flex justify-end">
          <SalidaFormModal profesores={profesores} currentUserId={userId} />
        </div>
      )}
      <SalidasClient
        rows={rows}
        profesores={profesores}
        currentUserId={userId}
        canManageAll={isEquipoDirectivo}
        showFilters={isEquipoDirectivo}
        schoolId={schoolId}
      />
    </div>
  );
}
