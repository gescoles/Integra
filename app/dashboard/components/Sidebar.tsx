"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home,
  Landmark,
  Users,
  ShieldCheck,
  CreditCard,
  Clock,
  Settings,
  ChevronRight,
  LogOut,
  BookOpen,
  Briefcase,
  UsersRound,
  ShieldAlert,
  Lock,
  CalendarClock,
  CalendarDays,
} from "lucide-react";
import { HexLogo } from "@/app/components/Logo";
import { ROLE_LABELS_FULL } from "../constants";
import { SchoolBadge } from "./SchoolBadge";
import { useUserAvatar } from "../SchoolContext";

const superadminNav = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/centros", label: "Centros", icon: Landmark },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users },
  { href: "/dashboard/roles", label: "Roles y permisos", icon: ShieldCheck },
  { href: "/dashboard/planes", label: "Planes", icon: CreditCard },
  { href: "/dashboard/auditoria", label: "Auditoría", icon: Clock },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

// Módulos reales, construidos y ya funcionando — su visibilidad depende de si
// el centro del usuario los tiene contratados (School.modules).
const centroModulos = [
  { key: "tutorias", href: "/dashboard/tutorias", label: "Tutorías", icon: Users },
  { key: "guardias", href: "/dashboard/guardias", label: "Guardias", icon: ShieldCheck },
  { key: "material", href: "/dashboard/material", label: "Material", icon: BookOpen },
];

// Funcionalidades que todavía no existen para nadie, independientemente del plan
const centroProximamente = [
  { label: "Prácticas", icon: Briefcase },
  { label: "Coordinación", icon: UsersRound },
  { label: "Disciplina", icon: ShieldAlert },
];

export function Sidebar({
  userName,
  role,
  contractedModules = [],
}: {
  userName: string;
  role: string;
  contractedModules?: string[];
}) {
  const pathname = usePathname();
  const avatarUrl = useUserAvatar();
  const initials = userName.slice(0, 2).toUpperCase();
  const roleLabel = ROLE_LABELS_FULL[role] ?? role;
  const isSuperAdmin = role === "SUPERADMIN";

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[#0B1D4D] lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-4">
        <HexLogo size={32} />
        <div className="leading-tight">
          <div className="text-base font-bold text-white">Integra</div>
          <div className="text-[10px] text-slate-400">
            Gestión inteligente para centros educativos
          </div>
        </div>
      </div>

      <nav className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-4">
        {isSuperAdmin &&
          superadminNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#2F6FED] text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

        {!isSuperAdmin && (
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/dashboard"
                ? "bg-[#2F6FED] text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Home className="h-4 w-4" />
            Inicio
          </Link>
        )}

        {!isSuperAdmin && (
          <Link
            href="/dashboard/calendario"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/dashboard/calendario"
                ? "bg-[#2F6FED] text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Calendario
          </Link>
        )}

        {!isSuperAdmin && (
          <Link
            href="/dashboard/horario"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/dashboard/horario"
                ? "bg-[#2F6FED] text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <CalendarClock className="h-4 w-4" />
            Mi horario
          </Link>
        )}

        {!isSuperAdmin &&
          centroModulos.map((item) => {
            const contratado = contractedModules.includes(item.key);
            const active = pathname === item.href;

            if (!contratado) {
              return (
                <div
                  key={item.key}
                  title="Tu centro no tiene este módulo contratado"
                  className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                </div>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#2F6FED] text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

        {!isSuperAdmin && (
          <div className="pt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Próximamente
            </div>
            {centroProximamente.map((item) => (
              <div
                key={item.label}
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500"
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-400">
                  Próximamente
                </span>
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        {!isSuperAdmin && (
          <div className="mb-1.5">
            <SchoolBadge variant="dark" compact />
          </div>
        )}
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2F6FED] text-[11px] font-bold text-white">
            <span>{initials}</span>
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={userName}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
          <div className="flex-1 overflow-hidden leading-tight">
            <div className="truncate text-[13px] font-semibold text-white">{userName}</div>
            <div className="truncate text-[10px] text-slate-400">{roleLabel}</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
