import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { ModuleLocked } from "../components/ModuleLocked";
import { CentroTutoriasClient } from "./CentroTutoriasClient";
import { AlumnosClient } from "./AlumnosClient";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";
import { translate } from "../i18n";
import { calcularEdad } from "@/lib/fechas";

async function getAlumnosData(profesorId: string, alumnoSeleccionado?: string) {
  const alumnosRaw = await prisma.alumno.findMany({
    where: { profesorId },
    include: {
      contactos: true,
      tutorias: { orderBy: { sessionDate: "desc" } },
    },
    orderBy: { nombre: "asc" },
  });

  const alumnos = alumnosRaw.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    curso: a.curso,
    edad: calcularEdad(a.fechaNacimiento),
    riesgo: a.riesgo,
    avatarUrl: a.avatarUrl,
    fechaNacimiento: a.fechaNacimiento ? a.fechaNacimiento.toISOString() : null,
    tipoDocumento: a.tipoDocumento,
    numeroDocumento: a.numeroDocumento,
    direccion: a.direccion,
    contactos: a.contactos.map((c) => ({
      id: c.id,
      relacion: c.relacion,
      telefono: c.telefono,
      email: c.email,
    })),
    tutorias: a.tutorias.map((t) => ({
      id: t.id,
      sessionDate: t.sessionDate.toISOString(),
      conQuien: t.conQuien,
      medio: t.medio,
      causa: t.causa,
      notas: t.notas,
      status: t.status,
      proximoSeguimiento: t.proximoSeguimiento ? t.proximoSeguimiento.toISOString() : null,
    })),
  }));

  const selected = alumnoSeleccionado
    ? alumnos.find((a) => a.id === alumnoSeleccionado) ?? null
    : alumnos[0] ?? null;

  return { alumnos, selected };
}

async function getCentroData(schoolId: string) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const finMes = new Date(inicioMes);
  finMes.setMonth(finMes.getMonth() + 1);
  finMes.setMilliseconds(-1);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const finHoy = new Date(hoy);
  finHoy.setHours(23, 59, 59, 999);

  const [tutoriasRaw, alumnosRaw, profesoresRaw] = await Promise.all([
    prisma.tutoria.findMany({
      where: { schoolId },
      include: {
        profesor: { select: { id: true, name: true, email: true } },
        alumno: { select: { id: true, nombre: true, curso: true } },
      },
      orderBy: { sessionDate: "desc" },
    }),
    prisma.alumno.findMany({
      where: { schoolId },
      include: {
        contactos: true,
        profesor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const tutorias = tutoriasRaw.map((t) => ({
    id: t.id,
    sessionDate: t.sessionDate.toISOString(),
    studentName: t.studentName,
    cicloModulo: t.cicloModulo,
    alumnoId: t.alumnoId,
    profesorId: t.profesorId,
    profesorName: t.profesor?.name ?? t.profesor?.email ?? "—",
    conQuien: t.conQuien,
    medio: t.medio,
    causa: t.causa,
    status: t.status,
    notas: t.notas,
    proximoSeguimiento: t.proximoSeguimiento ? t.proximoSeguimiento.toISOString() : null,
  }));

  const alumnos = alumnosRaw.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    curso: a.curso,
    edad: calcularEdad(a.fechaNacimiento),
    riesgo: a.riesgo,
    avatarUrl: a.avatarUrl,
    profesorId: a.profesorId,
    profesorName: a.profesor?.name ?? a.profesor?.email ?? "—",
    createdAt: a.createdAt.toISOString(),
    fechaNacimiento: a.fechaNacimiento ? a.fechaNacimiento.toISOString() : null,
    tipoDocumento: a.tipoDocumento,
    numeroDocumento: a.numeroDocumento,
    direccion: a.direccion,
    contactos: a.contactos.map((c) => ({
      id: c.id,
      relacion: c.relacion,
      telefono: c.telefono,
      email: c.email,
    })),
  }));

  const profesores = profesoresRaw.map((p) => ({
    id: p.id,
    name: p.name ?? p.email,
  }));

  const tutoriasHoy = tutoriasRaw.filter(
    (t) => t.sessionDate >= hoy && t.sessionDate <= finHoy
  );
  const tutoriasHoyFamilia = tutoriasHoy.filter((t) => t.conQuien === "FAMILIA").length;
  const tutoriasHoyAlumno = tutoriasHoy.filter((t) => t.conQuien === "ALUMNO").length;

  const pendientesSeguimiento = tutoriasRaw.filter((t) => t.status === "PENDIENTE").length;
  const alumnosConAlertas = alumnosRaw.filter(
    (a) => a.riesgo === "MEDIO" || a.riesgo === "ALTO"
  ).length;
  const profesoresActivos = new Set(
    tutoriasRaw
      .filter((t) => t.sessionDate >= inicioMes && t.sessionDate <= finMes)
      .map((t) => t.profesorId)
  ).size;

  const stats = {
    tutoriasHoy: tutoriasHoy.length,
    tutoriasHoyFamilia,
    tutoriasHoyAlumno,
    pendientesSeguimiento,
    alumnosConAlertas,
    profesoresActivos,
  };

  return { tutorias, alumnos, profesores, stats };
}

export default async function TutoriasPage({
  searchParams,
}: {
  searchParams: { alumno?: string; vista?: string; school?: string };
}) {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";
  const userId = session?.user.id;
  const locale = session?.user.locale ?? "ES";

  // SuperAdmin: elige cualquier centro para supervisarlo por completo
  if (role === "SUPERADMIN") {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "tutorias" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "tutorias.title")} subtitle={translate(locale, "tutorias.subtitle.superadmin")} userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              Ningún centro tiene el módulo de Tutorías contratado todavía.
            </div>
          ) : (
            <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/tutorias" />
          )}
        </div>
      );
    }

    const { tutorias, alumnos, profesores, stats } = await getCentroData(searchParams.school);
    return (
      <div>
        <DashboardHeader title={translate(locale, "tutorias.title")} subtitle={translate(locale, "tutorias.subtitle.superadmin")} userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={searchParams.school} locale={locale} basePath="/dashboard/tutorias" />
        <CentroTutoriasClient tutorias={tutorias} alumnos={alumnos} profesores={profesores} stats={stats} schoolId={searchParams.school} isSuperAdmin />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "tutorias.title")}
          subtitle={translate(locale, "tutorias.subtitle.coordinacion")}
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario no tiene un centro asignado todavía.
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { modules: true },
  });

  if (!school?.modules.includes("tutorias")) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "tutorias.title")}
          subtitle={translate(locale, "tutorias.subtitle.coordinacion")}
          userName={userName}
          role={role}
        />
        <ModuleLocked moduleName="Tutorías" />
      </div>
    );
  }

  const isProfesor = role === "PROFESOR";
  const isCoordinacion = role === "COORDINADOR" || role === "ADMIN_CENTRO";

  // El Profesor solo ve su propio listado de alumnos, sin pestañas.
  if (isProfesor && userId) {
    const { alumnos, selected } = await getAlumnosData(userId, searchParams.alumno);
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "tutorias.title")}
          subtitle={translate(locale, "tutorias.subtitle.profesor")}
          userName={userName}
          role={role}
          notificationCount={0}
        />
        <AlumnosClient alumnos={alumnos} selected={selected} tutorName={userName} />
      </div>
    );
  }

  // Coordinación / Admin de centro: pestañas — sus propios alumnos, o todo el centro.
  if (isCoordinacion && userId) {
    const vista = searchParams.vista === "mios" ? "mios" : "centro";

    let content: React.ReactNode;
    if (vista === "mios") {
      const { alumnos, selected } = await getAlumnosData(userId, searchParams.alumno);
      content = <AlumnosClient alumnos={alumnos} selected={selected} tutorName={userName} />;
    } else {
      const { tutorias, alumnos, profesores, stats } = await getCentroData(schoolId);
      content = (
        <CentroTutoriasClient tutorias={tutorias} alumnos={alumnos} profesores={profesores} stats={stats} schoolId={schoolId} />
      );
    }

    return (
      <div>
        <DashboardHeader
          title={translate(locale, "tutorias.title")}
          subtitle={translate(locale, "tutorias.subtitle.coordinacion")}
          userName={userName}
          role={role}
          notificationCount={0}
        />

        <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <Link
            href="/dashboard/tutorias?vista=mios"
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              vista === "mios" ? "bg-[#FD5249] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {translate(locale, "tutorias.tabMios")}
          </Link>
          <Link
            href="/dashboard/tutorias?vista=centro"
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              vista === "centro" ? "bg-[#FD5249] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {translate(locale, "tutorias.tabCentro")}
          </Link>
        </div>

        {content}
      </div>
    );
  }

  return null;
}
