import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { CreateSchoolModal } from "./CreateSchoolModal";
import { CentrosClient } from "./CentrosClient";
import { Building2, Briefcase, ShieldCheck, Users, ClipboardList, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function CentrosPage() {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "SuperAdmin";
  const role = session?.user.role ?? "SUPERADMIN";

  const schoolsRaw = await prisma.school.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  });

  const schools = schoolsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    city: s.city,
    plan: s.plan,
    status: s.status,
    userLimit: s.userLimit,
    modules: s.modules,
    userCount: s._count.users,
    updatedAt: new Date(s.updatedAt).toLocaleDateString("es-ES"),
    logoUrl: s.logoUrl,
  }));

  const stats = {
    activos: schools.filter((s) => s.status === "ACTIVO").length,
    revision: schools.filter((s) => s.status === "REVISION").length,
    pro: schools.filter((s) => s.plan === "PRO").length,
    usuarios: schools.reduce((sum, s) => sum + s.userCount, 0),
  };

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "centros.title")}
        subtitle={translate(locale, "centros.subtitle")}
        userName={userName}
        role={role}
        notificationCount={3}
      />

      {/* Acciones principales */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Building2 className="h-8 w-8 text-[#2F6FED]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[#0B1D4D]">Crear centro</h3>
            <p className="mt-1 text-sm text-slate-500">
              Da de alta un nuevo centro y configura sus módulos contratados.
            </p>
            <div className="mt-3">
              <CreateSchoolModal />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <ClipboardList className="h-8 w-8 text-[#2F6FED]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[#0B1D4D]">Lista de centros</h3>
            <p className="mt-1 text-sm text-slate-500">
              Consulta, edita y administra los centros registrados.
            </p>
            <a
              href="#lista-de-centros"
              className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#2F6FED] px-4 py-2 text-sm font-semibold text-[#2F6FED] hover:bg-blue-50"
            >
              Ver lista <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Building2 className="h-5 w-5 text-[#2F6FED]" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Centros activos</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.activos}</div>
          <Link href="#lista-de-centros" className="mt-2 inline-block text-xs font-semibold text-[#2F6FED] hover:underline">
            Ver todos los centros →
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Briefcase className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Pendientes de revisión</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.revision}</div>
          <Link href="#lista-de-centros" className="mt-2 inline-block text-xs font-semibold text-[#2F6FED] hover:underline">
            Ver pendientes →
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
            <ShieldCheck className="h-5 w-5 text-violet-600" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Planes Pro</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.pro}</div>
          <Link href="/dashboard/planes" className="mt-2 inline-block text-xs font-semibold text-[#2F6FED] hover:underline">
            Ver planes →
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Usuarios totales</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{stats.usuarios}</div>
          <Link href="/dashboard/usuarios" className="mt-2 inline-block text-xs font-semibold text-[#2F6FED] hover:underline">
            Ver usuarios →
          </Link>
        </div>
      </div>

      {/* Lista + edición rápida */}
      <div id="lista-de-centros" className="mt-5 scroll-mt-6">
        <CentrosClient schools={schools} />
      </div>
    </div>
  );
}
