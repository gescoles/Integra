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
  LogOut,
  BookOpen,
  Briefcase,
  UsersRound,
  ShieldAlert,
  Lock,
  CalendarClock,
  CalendarDays,
  Bus,
  CheckSquare,
  Bot,
} from "lucide-react";
import { HexLogo } from "@/app/components/Logo";
import { ROLE_LABELS_FULL } from "../constants";
import { SchoolBadge } from "./SchoolBadge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserProfileButton } from "./UserProfileButton";
import { useLocale } from "../SchoolContext";
import { translate, TranslationKey } from "../i18n";

const superadminNav: { href: string; labelKey: TranslationKey; icon: typeof Home }[] = [
  { href: "/dashboard", labelKey: "nav.inicio", icon: Home },
  { href: "/dashboard/centros", labelKey: "nav.centros", icon: Landmark },
  { href: "/dashboard/usuarios", labelKey: "nav.usuarios", icon: Users },
  { href: "/dashboard/tutorias", labelKey: "nav.tutorias", icon: Users },
  { href: "/dashboard/guardias", labelKey: "nav.guardias", icon: ShieldCheck },
  { href: "/dashboard/material", labelKey: "nav.material", icon: BookOpen },
  { href: "/dashboard/salidas", labelKey: "nav.salidas", icon: Bus },
  { href: "/dashboard/salidas/aprobaciones", labelKey: "nav.aprobaciones", icon: CheckSquare },
  { href: "/dashboard/calendario", labelKey: "nav.calendario", icon: CalendarDays },
  { href: "/dashboard/horario", labelKey: "nav.horario", icon: CalendarClock },
  { href: "/dashboard/roles", labelKey: "nav.roles", icon: ShieldCheck },
  { href: "/dashboard/planes", labelKey: "nav.planes", icon: CreditCard },
  { href: "/dashboard/auditoria", labelKey: "nav.auditoria", icon: Clock },
  { href: "/dashboard/chatbot-admin", labelKey: "nav.chatbotAdmin", icon: Bot },
  { href: "/dashboard/configuracion", labelKey: "nav.configuracion", icon: Settings },
];

// Módulos reales, construidos y ya funcionando — su visibilidad depende de si
// el centro del usuario los tiene contratados (School.modules).
const centroModulos: { key: string; href: string; labelKey: TranslationKey; icon: typeof Users }[] = [
  { key: "tutorias", href: "/dashboard/tutorias", labelKey: "nav.tutorias", icon: Users },
  { key: "guardias", href: "/dashboard/guardias", labelKey: "nav.guardias", icon: ShieldCheck },
  { key: "material", href: "/dashboard/material", labelKey: "nav.material", icon: BookOpen },
  { key: "salidas", href: "/dashboard/salidas", labelKey: "nav.salidas", icon: Bus },
];

// Utilidades (Calendario y Horario): igual que los módulos de arriba, solo
// se activan si el centro las tiene contratadas ("utilidades" en modules).
const utilidadesModulos: { key: string; href: string; labelKey: TranslationKey; icon: typeof Users }[] = [
  { key: "utilidades", href: "/dashboard/calendario", labelKey: "nav.calendario", icon: CalendarDays },
  { key: "utilidades", href: "/dashboard/horario", labelKey: "nav.miHorario", icon: CalendarClock },
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
  const { locale } = useLocale();
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
                {translate(locale, item.labelKey)}
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
            {translate(locale, "nav.inicio")}
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
                  title={translate(locale, "nav.moduloNoContratado")}
                  className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {translate(locale, item.labelKey)}
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
                {translate(locale, item.labelKey)}
              </Link>
            );
          })}

        {!isSuperAdmin &&
          contractedModules.includes("salidas") &&
          (role === "COORDINADOR" || role === "ADMIN_CENTRO") && (
            <Link
              href="/dashboard/salidas/aprobaciones"
              className={`ml-6 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                pathname === "/dashboard/salidas/aprobaciones"
                  ? "bg-[#2F6FED] text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {translate(locale, "nav.aprobaciones")}
            </Link>
          )}

        {!isSuperAdmin && (
          <div className="pt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {translate(locale, "nav.utilidades")}
            </div>
            {utilidadesModulos.map((item) => {
              const contratado = contractedModules.includes(item.key);
              const active = pathname === item.href;

              if (!contratado) {
                return (
                  <div
                    key={item.href}
                    title={translate(locale, "nav.moduloNoContratado")}
                    className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {translate(locale, item.labelKey)}
                    </span>
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                );
              }

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
                  {translate(locale, item.labelKey)}
                </Link>
              );
            })}
          </div>
        )}

        {!isSuperAdmin && (
          <div className="pt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {translate(locale, "nav.proximamente")}
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
                  {translate(locale, "nav.proximamente")}
                </span>
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <LanguageSwitcher variant="dark" />
        {!isSuperAdmin && (
          <div className="mb-1.5">
            <SchoolBadge variant="dark" compact />
          </div>
        )}
        <UserProfileButton userName={userName} roleLabel={roleLabel} locale={locale} />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> {translate(locale, "sidebar.cerrarSesion")}
        </button>
      </div>
    </aside>
  );
}
