import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "./components/DashboardHeader";
import { ActivityChart } from "./components/ActivityChart";
import { PlansDonut } from "./components/PlansDonut";
import { HistoriasBar } from "./components/HistoriasBar";
import { translate, AppLocale } from "./i18n";
import { contarAccesosBloqueadosActivos } from "./superadmin/seguridad/actions";
import {
  Landmark,
  Users,
  ShieldCheck,
  Calendar,
  FolderOpen,
  ArrowRight,
  UserPlus,
  UsersRound,
  CreditCard,
  Settings,
  Bus,
  ShieldAlert,
} from "lucide-react";

const quickActions = [
  {
    icon: UserPlus,
    color: "bg-blue-50 text-[#FD5249]",
    title: "Añadir nuevo centro",
    text: "Registra un nuevo centro en la plataforma",
    href: "/dashboard/centros",
  },
  {
    icon: UsersRound,
    color: "bg-emerald-50 text-emerald-600",
    title: "Gestionar usuarios",
    text: "Administra los usuarios de todos los centros",
    href: "/dashboard/usuarios",
  },
  {
    icon: ShieldCheck,
    color: "bg-violet-50 text-violet-600",
    title: "Roles y permisos",
    text: "Configura los permisos de la plataforma",
    href: "/dashboard/roles",
  },
  {
    icon: CreditCard,
    color: "bg-amber-50 text-amber-600",
    title: "Gestionar planes",
    text: "Crea y administra los planes de suscripción",
    href: "/dashboard/planes",
  },
  {
    icon: Settings,
    color: "bg-slate-100 text-slate-600",
    title: "Configuración",
    text: "Ajustes generales de la plataforma",
    href: "/dashboard/configuracion",
  },
];

const PLAN_COLORS: Record<string, string> = {
  BASICO: "#FD5249",
  PRO: "#22C55E",
  PREMIUM: "#A855F7",
};
const PLAN_LABELS: Record<string, string> = {
  BASICO: "Plan Básico",
  PRO: "Plan Pro",
  PREMIUM: "Plan Premium",
};

function timeAgo(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days === 1 ? "" : "s"}`;
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export async function SuperAdminHome({
  userId,
  userName,
  role,
  locale = "ES",
}: {
  userId: string;
  userName: string;
  role: string;
  locale?: AppLocale;
}) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    salidasPendientes,
    accesosBloqueadosCount,
    centrosCount,
    usuariosActivosCount,
    guardiasCount,
    tutoriasActivasCount,
    materialCount,
    schoolsByPlan,
    recentSchools,
    recentUsers,
    activityLast7Days,
  ] = await Promise.all([
    prisma.salida.count({ where: { estado: "PENDIENTE" } }),
    contarAccesosBloqueadosActivos(),
    prisma.school.count(),
    prisma.user.count({ where: { status: "ACTIVO" } }),
    prisma.guardia.count(),
    prisma.tutoria.count({ where: { status: { not: "COMPLETADA" } } }),
    prisma.materialRequest.count(),
    prisma.school.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.school.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { name: true, createdAt: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { email: true, createdAt: true },
    }),
    Promise.all([
      prisma.school.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
      prisma.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
      prisma.tutoria.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
      prisma.guardia.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
      prisma.materialRequest.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
    ]),
  ]);

  const stats = [
    {
      label: "Centros registrados",
      value: centrosCount,
      cta: "Ver todos los centros",
      href: "/dashboard/centros",
      icon: Landmark,
      color: "bg-blue-50 text-[#FD5249]",
    },
    {
      label: "Usuarios activos",
      value: usuariosActivosCount,
      cta: "Ver usuarios",
      href: "/dashboard/usuarios",
      icon: Users,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Guardias registradas",
      value: guardiasCount,
      cta: "Ver guardias",
      href: "/dashboard/auditoria",
      icon: ShieldCheck,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Tutorías activas",
      value: tutoriasActivasCount,
      cta: "Ver tutorías",
      href: "/dashboard/auditoria",
      icon: Calendar,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Solicitudes de material",
      value: materialCount,
      cta: "Ver material",
      href: "/dashboard/auditoria",
      icon: FolderOpen,
      color: "bg-sky-50 text-sky-600",
    },
  ];

  const plansData = schoolsByPlan.map((p) => ({
    name: PLAN_LABELS[p.plan] ?? p.plan,
    value: p._count._all,
    color: PLAN_COLORS[p.plan] ?? "#94A3B8",
  }));

  // Combinar centros y usuarios recientes en una sola lista de actividad real
  const recentActivity = [
    ...recentSchools.map((s) => ({
      icon: Landmark,
      color: "bg-emerald-50 text-emerald-600",
      title: "Nuevo centro registrado",
      detail: s.name,
      time: timeAgo(s.createdAt),
      at: s.createdAt,
    })),
    ...recentUsers.map((u) => ({
      icon: UserPlus,
      color: "bg-blue-50 text-[#FD5249]",
      title: "Usuario creado",
      detail: u.email,
      time: timeAgo(u.createdAt),
      at: u.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);

  const [schoolsIn7, usersIn7, tutoriasIn7, guardiasIn7, materialIn7] = activityLast7Days;
  const allEvents = [
    ...schoolsIn7,
    ...usersIn7,
    ...tutoriasIn7,
    ...guardiasIn7,
    ...materialIn7,
  ];
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const label = dayLabel(d);
    const count = allEvents.filter((e) => dayLabel(new Date(e.createdAt)) === label).length;
    return { day: label, value: count };
  });

  return (
    <div>
      <DashboardHeader
        title={`${translate(locale, "home.saludo")}, ${userName}!`}
        subtitle={translate(locale, "home.subtitle.superadmin")}
        userName={userName}
        role={role}
        notificationCount={recentActivity.length}
      />

      <HistoriasBar puedeSubir={false} currentUserId={userId} currentUserRole={role} currentUserSchoolId={null} />

      {salidasPendientes > 0 && (
        <Link
          href="/dashboard/salidas/aprobaciones"
          className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100"
        >
          <div className="flex items-center gap-2.5">
            <Bus className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {salidasPendientes === 1
                ? translate(locale, "home.salidaPendienteSingular")
                : `${salidasPendientes} ${translate(locale, "home.salidasPendientesPlural")}`}
            </span>
          </div>
          <span className="text-xs font-semibold text-amber-700 underline">
            {translate(locale, "home.revisarAhora")}
          </span>
        </Link>
      )}

      {accesosBloqueadosCount > 0 && (
        <Link
          href="/dashboard/superadmin/seguridad"
          className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
            <span className="text-sm font-semibold text-red-800">
              {accesosBloqueadosCount === 1
                ? "Hay 1 acceso bloqueado por intentos fallidos"
                : `Hay ${accesosBloqueadosCount} accesos bloqueados por intentos fallidos`}
            </span>
          </div>
          <span className="text-xs font-semibold text-red-700 underline">Revisar ahora</span>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-xs text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{s.value}</div>
            <Link
              href={s.href}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#FD5249] hover:underline"
            >
              {s.cta} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </div>

      {/* Chart + activity + donut */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1.2fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B1D4D]">Actividad en la plataforma</h3>
            <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
              Últimos 7 días
            </span>
          </div>
          <ActivityChart data={chartData} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Actividad reciente</h3>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-400">
              Todavía no hay actividad. En cuanto crees centros o usuarios,
              aparecerán aquí.
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((a) => (
                <div key={a.title + a.detail} className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.color}`}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-700">{a.title}</div>
                    <div className="truncate text-xs text-slate-500">{a.detail}</div>
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-400">{a.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Centros por plan</h3>
          <PlansDonut data={plansData} />
          <Link
            href="/dashboard/planes"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#FD5249] hover:underline"
          >
            Ver todos los planes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Acciones rápidas</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {quickActions.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="group rounded-xl border border-slate-200 p-4 transition-colors hover:border-[#FD5249]"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.color}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-[#0B1D4D]">
                {a.title}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-1 text-xs text-slate-500">{a.text}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Banner */}
      <div className="mt-5 flex flex-col items-center gap-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-8 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
          <ShieldCheck className="h-12 w-12 text-[#FD5249]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-bold text-[#0B1D4D]">Todo bajo control</h3>
          <p className="mt-1 text-sm text-slate-600">
            Desde aquí puedes gestionar todos los centros, usuarios, planes y
            permisos de la plataforma. Docentium te da el control total para que
            los centros puedan enfocarse en lo importante: la educación.
          </p>
        </div>
        <a
          href="#"
          className="shrink-0 rounded-lg border border-[#FD5249] px-5 py-2.5 text-sm font-semibold text-[#FD5249] hover:bg-white"
        >
          Ver documentación
        </a>
      </div>
    </div>
  );
}
