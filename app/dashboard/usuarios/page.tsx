import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { CreateUserModal } from "./CreateUserModal";
import { UsuariosClient } from "./UsuariosClient";
import { SchoolPicker, SchoolSwitcher } from "../components/SchoolPicker";
import { User, Briefcase, Users as UsersIcon, UserPlus, UserX } from "lucide-react";

// Valor especial usado en la URL (?school=sin-asignar) para ver a los
// usuarios que todavía no tienen ningún centro asignado. No es un id real
// de la tabla School.
const UNASSIGNED = "sin-asignar";

async function getUsersForSchool(schoolId: string | null) {
  const usersRaw = await prisma.user.findMany({
    where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMINISTRACION", "DIRECCION"] } },
    include: {
      school: { select: { name: true } },
      departamentos: { select: { id: true, nombre: true } },
      departamentosCoordinados: { select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return usersRaw.map((u) => ({
    id: u.id,
    name: u.name ?? u.email.split("@")[0],
    email: u.email,
    dni: u.dni,
    role: u.role,
    status: u.status,
    schoolId: u.schoolId,
    schoolName: u.school?.name ?? null,
    avatarUrl: u.avatarUrl,
    locale: u.locale,
    departamentos: (u.role === "COORDINADOR" ? u.departamentosCoordinados : u.departamentos).map((d) => d.nombre),
    lastAccessAt: u.lastAccessAt
      ? new Date(u.lastAccessAt).toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
  }));
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "SuperAdmin";
  const role = session?.user.role ?? "SUPERADMIN";
  const isSuperAdmin = role === "SUPERADMIN";

  const allSchools = await prisma.school.findMany({
    select: { id: true, name: true, logoUrl: true },
    orderBy: { name: "asc" },
  });

  // Cada centro ve solo a su propia gente: un SuperAdmin tiene que elegir
  // primero qué centro quiere administrar (como ya pasa en Tutorías), y un
  // usuario de un centro concreto (si llegara a esta pantalla) solo ve el suyo.
  const selectedSchoolId = isSuperAdmin ? searchParams.school : session?.user.schoolId ?? undefined;
  const isUnassignedView = selectedSchoolId === UNASSIGNED;

  if (isSuperAdmin && !selectedSchoolId) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "usuarios.title")}
          subtitle={translate(locale, "usuarios.subtitle.elegirCentro")}
          userName={userName}
          role={role}
          notificationCount={0}
        />
        <nav className="mb-5 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard" className="hover:text-[#FD5249]">
            {translate(locale, "nav.inicio")}
          </Link>
          <span>›</span>
          <span className="text-slate-500">{translate(locale, "nav.usuarios")}</span>
        </nav>
        {allSchools.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
            {translate(locale, "centros.sinCentros")}
          </div>
        ) : (
          <>
            <SchoolPicker schools={allSchools} locale={locale} basePath="/dashboard/usuarios" />
            <div className="mt-4 text-center">
              <Link
                href={`/dashboard/usuarios?school=${UNASSIGNED}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#FD5249]"
              >
                <UserX className="h-3.5 w-3.5" />
                {translate(locale, "usuarios.verSinAsignar")}
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!selectedSchoolId) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "usuarios.title")}
          subtitle={translate(locale, "usuarios.subtitle.centro")}
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "usuarios.sinCentroPropio")}
        </div>
      </div>
    );
  }

  const users = await getUsersForSchool(isUnassignedView ? null : selectedSchoolId);
  // El modal de "Nuevo usuario" ofrece el centro que se está viendo por
  // defecto; en la vista de "sin asignar" no hay un centro por defecto
  // razonable, así que ahí se ofrecen todos.
  const schoolsForCreate = isUnassignedView
    ? allSchools
    : allSchools.filter((s) => s.id === selectedSchoolId);

  const stats = {
    profesores: users.filter((u) => u.role === "PROFESOR").length,
    equipoDirectivo: users.filter((u) => u.role === "COORDINADOR").length,
    total: users.length,
  };

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "usuarios.title")}
        subtitle={translate(locale, "usuarios.subtitle.centro")}
        userName={userName}
        role={role}
        notificationCount={0}
      />

      <nav className="mb-5 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-[#FD5249]">
          {translate(locale, "nav.inicio")}
        </Link>
        <span>›</span>
        <span className="text-slate-500">{translate(locale, "nav.usuarios")}</span>
      </nav>

      {isSuperAdmin && (
        <div className="mb-5 flex flex-wrap items-start gap-2">
          <div className="flex-1">
            <SchoolSwitcher
              schools={allSchools}
              currentSchoolId={isUnassignedView ? "" : selectedSchoolId}
              locale={locale}
              basePath="/dashboard/usuarios"
            />
          </div>
          <Link
            href={`/dashboard/usuarios?school=${UNASSIGNED}`}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              isUnassignedView
                ? "border-[#FD5249] bg-blue-50 text-[#FD5249]"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <UserX className="h-3.5 w-3.5" />
            {translate(locale, "usuarios.sinAsignar")}
          </Link>
        </div>
      )}

      {/* Stats + crear usuario */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <User className="h-5 w-5 text-[#FD5249]" />
          </div>
          <div className="mt-3 text-xs text-slate-500">{translate(locale, "usuarios.profesores")}</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.profesores}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <Briefcase className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-xs text-slate-500">{translate(locale, "usuarios.equipoDirectivo")}</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.equipoDirectivo}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
            <UsersIcon className="h-5 w-5 text-violet-600" />
          </div>
          <div className="mt-3 text-xs text-slate-500">{translate(locale, "usuarios.totalUsuarios")}</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <UserPlus className="h-5 w-5 text-[#FD5249]" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">{translate(locale, "usuarios.crearNuevoUsuario")}</h3>
          <p className="mt-1 text-xs text-slate-500">{translate(locale, "usuarios.anadeUsuarioCentro")}</p>
          <div className="mt-3">
            <CreateUserModal schools={schoolsForCreate} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <UsuariosClient users={users} schools={schoolsForCreate} allSchools={allSchools} />
      </div>
    </div>
  );
}
