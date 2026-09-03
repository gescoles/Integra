import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { MisAlumnosClient } from "./MisAlumnosClient";
import { NuevoAlumnoModal } from "../tutorias/NuevoAlumnoModal";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";
import { VistaAlumnosTabs } from "./VistaAlumnosTabs";
import { calcularEdad } from "@/lib/fechas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAlumnos(schoolId: string, soloProfesorId?: string) {
  const alumnosRaw = await prisma.alumno.findMany({
    where: { schoolId, ...(soloProfesorId ? { profesorId: soloProfesorId } : {}) },
    include: {
      profesor: { select: { name: true, email: true } },
      contactos: true,
      // Solo contamos las tutorías ya COMPLETADAS como "hechas" — una
      // PENDIENTE todavía no se ha realizado de verdad.
      _count: { select: { tutorias: { where: { status: "COMPLETADA" } } } },
    },
    orderBy: { nombre: "asc" },
  });

  return alumnosRaw.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    curso: a.curso,
    edad: calcularEdad(a.fechaNacimiento),
    riesgo: a.riesgo,
    avatarUrl: a.avatarUrl,
    profesorId: a.profesorId,
    profesorNombre: a.profesor.name ?? a.profesor.email,
    totalTutorias: a._count.tutorias,
    fechaNacimiento: a.fechaNacimiento?.toISOString() ?? null,
    tipoDocumento: a.tipoDocumento,
    numeroDocumento: a.numeroDocumento,
    direccion: a.direccion,
    contactos: a.contactos.map((c) => ({ id: c.id, relacion: c.relacion, telefono: c.telefono, email: c.email })),
  }));
}

export default async function MisAlumnosPage({
  searchParams,
}: {
  searchParams: { school?: string; vista?: string };
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
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "misAlumnos.titleSuperadmin")} subtitle={translate(locale, "misAlumnos.subtitleDirectivo")} userName={userName} role={role} />
          <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/mis-alumnos" />
        </div>
      );
    }

    const alumnos = await getAlumnos(searchParams.school);
    return (
      <div>
        <DashboardHeader title={translate(locale, "misAlumnos.titleSuperadmin")} subtitle={translate(locale, "misAlumnos.subtitleDirectivo")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/mis-alumnos" />
        <div className="mb-5 flex justify-end">
          <NuevoAlumnoModal />
        </div>
        <MisAlumnosClient alumnos={alumnos} showProfesorColumn showFiltroCiclo />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "misAlumnos.title")} subtitle={translate(locale, "misAlumnos.subtitle")} userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  // Coordinación/Dirección puede alternar entre "Mis alumnos" (los suyos
  // propios, ya que también pueden ser tutores) y "Alumnos del centro"
  // (todos). Por defecto ven los suyos, igual que un profesor.
  const vistaCentro = isEquipoDirectivo && searchParams.vista === "centro";
  const alumnos = await getAlumnos(schoolId, vistaCentro ? undefined : userId);

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "misAlumnos.title")}
        subtitle={vistaCentro ? translate(locale, "misAlumnos.subtitleDirectivo") : translate(locale, "misAlumnos.subtitle")}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      {isEquipoDirectivo && <VistaAlumnosTabs vistaCentro={vistaCentro} />}
      <div className="mb-5 flex justify-end">
        <NuevoAlumnoModal />
      </div>
      <MisAlumnosClient alumnos={alumnos} showProfesorColumn={vistaCentro} showFiltroCiclo={vistaCentro} />
    </div>
  );
}
