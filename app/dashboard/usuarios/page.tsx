import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { CreateUserModal } from "./CreateUserModal";
import { UsuariosClient } from "./UsuariosClient";
import { User, Briefcase, Users as UsersIcon, UserPlus } from "lucide-react";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "SuperAdmin";
  const role = session?.user.role ?? "SUPERADMIN";

  const [usersRaw, schools] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["PROFESOR", "COORDINADOR"] } },
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.school.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const users = usersRaw.map((u) => ({
    id: u.id,
    name: u.name ?? u.email.split("@")[0],
    email: u.email,
    dni: u.dni,
    role: u.role,
    status: u.status,
    schoolId: u.schoolId,
    schoolName: u.school?.name ?? null,
    avatarUrl: u.avatarUrl,
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

  const stats = {
    profesores: users.filter((u) => u.role === "PROFESOR").length,
    equipoDirectivo: users.filter((u) => u.role === "COORDINADOR").length,
    total: users.length,
  };

  return (
    <div>
      <DashboardHeader
        title="Usuarios"
        subtitle="Administra los usuarios de todos los centros."
        userName={userName}
        role={role}
        notificationCount={3}
      />

      <nav className="mb-5 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-[#2F6FED]">
          Inicio
        </Link>
        <span>›</span>
        <span className="text-slate-500">Usuarios</span>
      </nav>

      {/* Stats + crear usuario */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <User className="h-5 w-5 text-[#2F6FED]" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Profesores</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.profesores}</div>
          <span className="mt-2 inline-block text-xs font-semibold text-[#2F6FED]">
            Ver profesores →
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <Briefcase className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Equipo directivo</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.equipoDirectivo}</div>
          <span className="mt-2 inline-block text-xs font-semibold text-[#2F6FED]">
            Ver equipo directivo →
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
            <UsersIcon className="h-5 w-5 text-violet-600" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Total usuarios</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.total}</div>
          <span className="mt-2 inline-block text-xs font-semibold text-[#2F6FED]">
            Ver todos los usuarios →
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <UserPlus className="h-5 w-5 text-[#2F6FED]" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">Crear nuevo usuario</h3>
          <p className="mt-1 text-xs text-slate-500">Añade un nuevo usuario a la plataforma.</p>
          <div className="mt-3">
            <CreateUserModal schools={schools} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <UsuariosClient users={users} schools={schools} />
      </div>
    </div>
  );
}
