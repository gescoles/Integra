import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { ModuleLocked } from "../components/ModuleLocked";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";
import { ProyectosTabs } from "./ProyectosTabs";
import { ProyectosClient } from "./ProyectosClient";
import { obtenerVentanasProyecto, obtenerProyectos, obtenerCiclosDelCentro } from "./actions";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: { school?: string; ventana?: string; ciclo?: string; nombre?: string };
}) {
  const session = await getServerSession(authOptions);
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";
  const isSuperAdmin = role === "SUPERADMIN";
  const puedeVerTodos = esDirectivo(role);

  // Las ventanas son globales (no dependen del centro), así que se cargan
  // siempre, incluso antes de saber qué centro se está mirando.
  const ventanas = await obtenerVentanasProyecto();

  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      where: { modules: { has: "proyectos" } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title="Proyectos" subtitle="Proyectos de grupo por ciclo formativo, con nota ponderada." userName={userName} role={role} />
          {schools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
              Ningún centro tiene el módulo de Proyectos contratado todavía.
            </div>
          ) : (
            <SchoolPicker schools={schools} locale="ES" basePath="/dashboard/proyectos" />
          )}
        </div>
      );
    }

    const schoolId = searchParams.school;
    const ventanaActiva = searchParams.ventana ?? ventanas[0]?.id ?? "";
    const [proyectos, ciclosCentro] = await Promise.all([
      ventanaActiva ? obtenerProyectos(ventanaActiva, { schoolId, ciclo: searchParams.ciclo, nombre: searchParams.nombre }) : Promise.resolve([]),
      obtenerCiclosDelCentro(schoolId),
    ]);

    return (
      <div>
        <DashboardHeader title="Proyectos" subtitle="Proyectos de grupo por ciclo formativo, con nota ponderada." userName={userName} role={role} />
        <SchoolSwitcher schools={schools} currentSchoolId={schoolId} locale="ES" basePath="/dashboard/proyectos" />
        <ProyectosTabs ventanas={ventanas} ventanaActiva={ventanaActiva} schoolId={schoolId} />
        <ProyectosClient
          proyectos={proyectos}
          ciclosCentro={ciclosCentro}
          ventanaId={ventanaActiva}
          esDirectivo
          currentUserId={session?.user.id ?? ""}
          schoolId={schoolId}
          filtros={{ ciclo: searchParams.ciclo, nombre: searchParams.nombre }}
        />
      </div>
    );
  }

  const schoolId = session?.user.schoolId ?? null;
  const userId = session?.user.id;

  if (!schoolId || !userId) {
    return (
      <div>
        <DashboardHeader title="Proyectos" subtitle="Proyectos de grupo por ciclo formativo, con nota ponderada." userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario no tiene un centro asignado todavía.
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } });

  if (!school?.modules.includes("proyectos")) {
    return (
      <div>
        <DashboardHeader title="Proyectos" subtitle="Proyectos de grupo por ciclo formativo, con nota ponderada." userName={userName} role={role} />
        <ModuleLocked moduleName="Proyectos" />
      </div>
    );
  }

  const ventanaActiva = searchParams.ventana ?? ventanas[0]?.id ?? "";
  const [proyectos, ciclosCentro] = await Promise.all([
    ventanaActiva
      ? obtenerProyectos(ventanaActiva, { ciclo: searchParams.ciclo, nombre: searchParams.nombre })
      : Promise.resolve([]),
    obtenerCiclosDelCentro(),
  ]);

  return (
    <div>
      <DashboardHeader
        title="Proyectos"
        subtitle="Crea un proyecto por clase con su rúbrica, y ve añadiendo dentro los grupos de alumnos con sus notas."
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <ProyectosTabs ventanas={ventanas} ventanaActiva={ventanaActiva} />
      <ProyectosClient
        proyectos={proyectos}
        ciclosCentro={ciclosCentro}
        ventanaId={ventanaActiva}
        esDirectivo={puedeVerTodos}
        currentUserId={userId}
        filtros={{ ciclo: searchParams.ciclo, nombre: searchParams.nombre }}
      />
    </div>
  );
}
