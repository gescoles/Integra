import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ModuleLocked } from "../components/ModuleLocked";
import { PracticasClient } from "./PracticasClient";
import { FichaAlumnoFormModal } from "./FichaAlumnoFormModal";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getFichasData(schoolId: string, soloProfesorId?: string) {
  const [fichasRaw, alumnosRaw, profesoresRaw, school] = await Promise.all([
    prisma.practicaAlumno.findMany({
      // Un profesor ve una ficha si es el tutor/a académico real del
      // alumno, O si es quien lleva las prácticas (responsable) — no
      // hace falta ser las dos cosas a la vez.
      where: {
        schoolId,
        ...(soloProfesorId
          ? { OR: [{ tutorImesId: soloProfesorId }, { responsablePracticasId: soloProfesorId }] }
          : {}),
      },
      include: {
        alumno: { select: { id: true, nombre: true, curso: true, avatarUrl: true } },
        tutorImes: { select: { id: true, name: true, email: true } },
        convenios: { select: { id: true, estadoAcuerdo: true, fechaInicio: true, fechaFin: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.alumno.findMany({
      where: { schoolId },
      select: {
        id: true,
        nombre: true,
        curso: true,
        avatarUrl: true,
        fechaNacimiento: true,
        tipoDocumento: true,
        numeroDocumento: true,
        direccion: true,
        profesor: { select: { name: true, email: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { grupos: true } }),
  ]);

  const rows = fichasRaw.map((f) => {
    const convenioActivo = [...f.convenios].sort((a, b) => {
      const fa = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
      const fb = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
      return fb - fa;
    })[0];

    return {
      id: f.id,
      alumnoNombre: f.alumno.nombre,
      alumnoCurso: f.alumno.curso,
      alumnoAvatarUrl: f.alumno.avatarUrl,
      promocion: f.promocion,
      cicloFormativo: f.cicloFormativo,
      tutorImesNombre: f.tutorImes?.name ?? f.tutorImes?.email ?? null,
      numConvenios: f.convenios.length,
      estadoConvenioActivo: convenioActivo?.estadoAcuerdo ?? null,
    };
  });

  // Alumnos que todavía NO tienen ficha creada (para el selector de "nueva ficha")
  const idsConFicha = new Set(fichasRaw.map((f) => f.alumno.id));
  const alumnosSinFicha = alumnosRaw
    .filter((a) => !idsConFicha.has(a.id))
    .map((a) => ({
      ...a,
      fechaNacimiento: a.fechaNacimiento ? a.fechaNacimiento.toISOString() : null,
      profesorNombre: a.profesor?.name ?? a.profesor?.email ?? null,
    }));
  const profesores = profesoresRaw.map((p) => ({ id: p.id, name: p.name ?? p.email }));

  return { rows, alumnosSinFicha, profesores, gruposCentro: school?.grupos ?? [] };
}

export default async function PracticasPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const isEquipoDirectivo = role === "COORDINADOR" || role === "ADMIN_CENTRO";
  const isProfesor = role === "PROFESOR";

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "practicas" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "practicas.title")} subtitle={translate(locale, "practicas.subtitle.superadmin")} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              {translate(locale, "practicas.ningunCentro")}
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/practicas" />
          )}
        </div>
      );
    }

    const { rows, alumnosSinFicha, profesores, gruposCentro } = await getFichasData(searchParams.school);
    return (
      <div>
        <DashboardHeader title={translate(locale, "practicas.title")} subtitle={translate(locale, "practicas.subtitle.superadmin")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/practicas" />
        <div className="mb-5 flex justify-end">
          <FichaAlumnoFormModal alumnos={alumnosSinFicha} userName={userName} gruposCentro={gruposCentro} />
        </div>
        <PracticasClient rows={rows} profesores={profesores} showFilters schoolId={searchParams.school} />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  const userId = session?.user.id;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "practicas.title")} subtitle={translate(locale, "practicas.subtitle.centro")} userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });
  if (!school?.modules.includes("practicas")) {
    return (
      <div>
        <DashboardHeader title={translate(locale, "practicas.title")} subtitle={translate(locale, "practicas.subtitle.centro")} userName={userName} role={role} />
        <ModuleLocked moduleName={translate(locale, "practicas.title")} />
      </div>
    );
  }

  if (!userId) return null;

  const { rows, alumnosSinFicha, profesores, gruposCentro } = await getFichasData(schoolId, isProfesor ? userId : undefined);

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "practicas.title")}
        subtitle={isProfesor ? translate(locale, "practicas.subtitle.profesor") : translate(locale, "practicas.subtitle.centro")}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <div className="mb-5 flex justify-end">
        <FichaAlumnoFormModal alumnos={alumnosSinFicha} userName={userName} gruposCentro={gruposCentro} />
      </div>
      <PracticasClient rows={rows} profesores={profesores} showFilters={isEquipoDirectivo} schoolId={schoolId} />
    </div>
  );
}
