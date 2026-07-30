import Link from "next/link";
import { DashboardHeader } from "./components/DashboardHeader";
import { ActivityChart } from "./components/ActivityChart";
import { PlansDonut } from "./components/PlansDonut";
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
  FileCheck2,
  ShieldPlus,
} from "lucide-react";

const stats = [
  {
    label: "Centros registrados",
    value: "18",
    cta: "Ver todos los centros",
    href: "/dashboard/centros",
    icon: Landmark,
    color: "bg-blue-50 text-[#2F6FED]",
  },
  {
    label: "Usuarios activos",
    value: "245",
    cta: "Ver usuarios",
    href: "/dashboard/usuarios",
    icon: Users,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Guardias esta semana",
    value: "312",
    cta: "Ver calendario",
    href: "/dashboard/auditoria",
    icon: ShieldCheck,
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Tutorías activas",
    value: "156",
    cta: "Ver tutorías",
    href: "/dashboard/auditoria",
    icon: Calendar,
    color: "bg-amber-50 text-amber-600",
  },
  {
    label: "Material compartido",
    value: "1.248",
    cta: "Ver material",
    href: "/dashboard/auditoria",
    icon: FolderOpen,
    color: "bg-sky-50 text-sky-600",
  },
];

const recentActivity = [
  {
    icon: Landmark,
    color: "bg-emerald-50 text-emerald-600",
    title: "Nuevo centro registrado",
    detail: "IES Joan Maragall",
    time: "Hace 2 horas",
  },
  {
    icon: UserPlus,
    color: "bg-blue-50 text-[#2F6FED]",
    title: "Usuario creado",
    detail: "marta.lopez@iesmontseny.cat",
    time: "Hace 5 horas",
  },
  {
    icon: ShieldPlus,
    color: "bg-violet-50 text-violet-600",
    title: "Plan actualizado",
    detail: "Plan Pro - IES La Salle",
    time: "Hace 1 día",
  },
  {
    icon: ShieldCheck,
    color: "bg-amber-50 text-amber-600",
    title: "Guardias publicadas",
    detail: "IES Barcelona",
    time: "Hace 1 día",
  },
  {
    icon: FileCheck2,
    color: "bg-sky-50 text-sky-600",
    title: "Material compartido",
    detail: "Programación 2º DAM",
    time: "Hace 2 días",
  },
];

const quickActions = [
  {
    icon: UserPlus,
    color: "bg-blue-50 text-[#2F6FED]",
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

export async function SuperAdminHome({
  userName,
  role,
}: {
  userName: string;
  role: string;
}) {
  return (
    <div>
      <DashboardHeader
        title={`¡Bienvenido, ${userName}!`}
        subtitle="Aquí tienes un resumen general de la plataforma."
        userName={userName}
        role={role}
        notificationCount={3}
      />

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
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
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
          <ActivityChart />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Actividad reciente</h3>
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
          <Link
            href="/dashboard/auditoria"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
          >
            Ver toda la actividad <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Centros por plan</h3>
          <PlansDonut />
          <Link
            href="/dashboard/planes"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
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
              className="group rounded-xl border border-slate-200 p-4 transition-colors hover:border-[#2F6FED]"
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
          <ShieldCheck className="h-12 w-12 text-[#2F6FED]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-bold text-[#0B1D4D]">Todo bajo control</h3>
          <p className="mt-1 text-sm text-slate-600">
            Desde aquí puedes gestionar todos los centros, usuarios, planes y
            permisos de la plataforma. Integra te da el control total para que
            los centros puedan enfocarse en lo importante: la educación.
          </p>
        </div>
        <a
          href="#"
          className="shrink-0 rounded-lg border border-[#2F6FED] px-5 py-2.5 text-sm font-semibold text-[#2F6FED] hover:bg-white"
        >
          Ver documentación
        </a>
      </div>
    </div>
  );
}
