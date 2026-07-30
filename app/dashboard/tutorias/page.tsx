import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { ModuleLocked } from "../components/ModuleLocked";
import { TutoriasClient } from "./TutoriasClient";
import { AlumnosClient } from "./AlumnosClient";

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
    edad: a.edad,
    riesgo: a.riesgo,
    avatarUrl: a.avatarUrl,
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
      notas: t.notas,
      status: t.status,
    })),
  }));

  const selected = alumnoSeleccionado
    ? alumnos.find((a) => a.id === alumnoSeleccionado) ?? null
    : alumnos[0] ?? null;

  return { alumnos, selected };
}

async function getCentroData(schoolId: string) {
  const [tutoriasRaw, profesoresRaw] = await Promise.all([
    prisma.tutoria.findMany({
      where: { schoolId },
      include: { profesor: { select: { id: true, name: true } } },
      orderBy: { sessionDate: "desc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = tutoriasRaw.map((t) => ({
    id: t.id,
    studentName: t.studentName,
    cicloModulo: t.cicloModulo,
    status: t.status,
    sessionDate: t.sessionDate.toISOString(),
    profesorId: t.profesorId,
    profesorName: t.profesor?.name ?? "—",
  }));

  const profesores = profesoresRaw.map((p) => ({
    id: p.id,
    name: p.name ?? p.email,
  }));

  return { rows, profesores };
}

export default async function TutoriasPage({
  searchParams,
}: {
  searchParams: { alumno?: string; vista?: string };
}) {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";
  const schoolId = session?.user.schoolId ?? null;
  const userId = session?.user.id;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title="Tutorías"
          subtitle="Gestiona las tutorías de tu centro."
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
          title="Tutorías"
          subtitle="Gestiona las tutorías de tu centro."
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
          title="Tutorías"
          subtitle="Gestiona tus alumnos y su historial de tutorías."
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
      const { rows, profesores } = await getCentroData(schoolId);
      content = <TutoriasClient rows={rows} profesores={profesores} />;
    }

    return (
      <div>
        <DashboardHeader
          title="Tutorías"
          subtitle="Gestiona tus alumnos, o consulta las tutorías de todo el centro."
          userName={userName}
          role={role}
          notificationCount={0}
        />

        <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <Link
            href="/dashboard/tutorias?vista=mios"
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              vista === "mios" ? "bg-[#2F6FED] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Mis alumnos
          </Link>
          <Link
            href="/dashboard/tutorias?vista=centro"
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              vista === "centro" ? "bg-[#2F6FED] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Todo el centro
          </Link>
        </div>

        {content}
      </div>
    );
  }

  return null;
}
