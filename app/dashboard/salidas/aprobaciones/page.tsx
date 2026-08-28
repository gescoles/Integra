import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../../components/DashboardHeader";
import { translate } from "../../i18n";
import { ModuleLocked } from "../../components/ModuleLocked";
import { AprobacionesClient } from "./AprobacionesClient";
import { SchoolPicker, SchoolSwitcher } from "../../components/SchoolPicker";

// Esta pantalla depende de un dato que cambia constantemente (quién ha
// aprobado o rechazado qué, justo ahora mismo), así que forzamos que Next.js
// nunca la sirva desde caché y siempre consulte la base de datos de verdad.
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPendientes(schoolId: string) {
  const salidasRaw = await prisma.salida.findMany({
    where: { schoolId, estado: "PENDIENTE" },
    include: {
      responsable: { select: { name: true, email: true } },
      creadoPor: { select: { name: true, email: true } },
    },
    orderBy: { fecha: "asc" },
  });

  const todosLosIds = Array.from(new Set(salidasRaw.flatMap((s) => s.profesoresIds)));
  const profesoresAcompanantes = todosLosIds.length
    ? await prisma.user.findMany({ where: { id: { in: todosLosIds } }, select: { id: true, name: true, email: true } })
    : [];
  const nombrePorId = new Map(profesoresAcompanantes.map((p) => [p.id, p.name ?? p.email]));

  return salidasRaw.map((s) => ({
    id: s.id,
    curso: s.curso,
    tipo: s.tipo,
    actividad: s.actividad,
    fecha: s.fecha.toISOString(),
    horaSalida: s.horaSalida,
    horaVuelta: s.horaVuelta,
    responsableName: s.responsable?.name ?? s.responsable?.email ?? "—",
    acompanantesNombres: s.profesoresIds.map((id) => nombrePorId.get(id) ?? "—"),
    numAlumnos: s.numAlumnos,
    costo: s.costo,
    moneda: s.moneda,
    observaciones: s.observaciones,
    creadoPorNombre: s.creadoPor?.name ?? s.creadoPor?.email ?? "—",
  }));
}

export default async function AprobacionesPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const isEquipoDirectivo = role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";

  // Solo el equipo directivo y el SuperAdmin pueden aprobar/rechazar salidas.
  if (!isSuperAdmin && !isEquipoDirectivo) {
    redirect("/dashboard/salidas");
  }

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "salidas" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "nav.aprobaciones")} subtitle={translate(locale, "salidas.subtitle.aprobaciones")} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              {translate(locale, "salidas.ningunCentro")}
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/salidas/aprobaciones" />
          )}
        </div>
      );
    }

    const rows = await getPendientes(searchParams.school);
    return (
      <div>
        <DashboardHeader title={translate(locale, "nav.aprobaciones")} subtitle={translate(locale, "salidas.subtitle.aprobaciones")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/salidas/aprobaciones" />
        <AprobacionesClient rows={rows} />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "nav.aprobaciones")} subtitle={translate(locale, "salidas.subtitle.aprobaciones")} userName={userName} role={role} />
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
        <DashboardHeader title={translate(locale, "nav.aprobaciones")} subtitle={translate(locale, "salidas.subtitle.aprobaciones")} userName={userName} role={role} />
        <ModuleLocked moduleName={translate(locale, "salidas.title")} />
      </div>
    );
  }

  const rows = await getPendientes(schoolId);

  return (
    <div>
      <DashboardHeader title={translate(locale, "nav.aprobaciones")} subtitle={translate(locale, "salidas.subtitle.aprobaciones")} userName={userName} role={role} notificationCount={0} />
      <AprobacionesClient rows={rows} />
    </div>
  );
}
