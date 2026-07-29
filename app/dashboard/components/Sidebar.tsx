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
} from "lucide-react";
import { HexLogo } from "@/app/components/Logo";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/centros", label: "Centros", icon: Landmark },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users },
  { href: "/dashboard/roles", label: "Roles y permisos", icon: ShieldCheck },
  { href: "/dashboard/planes", label: "Planes", icon: CreditCard },
  { href: "/dashboard/auditoria", label: "Auditoría", icon: Clock },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

const roleLabels: Record<string, string> = {
  SUPERADMIN: "Super Usuario",
  ADMIN_CENTRO: "Administrador de centro",
};

export function Sidebar({
  userName,
  role,
}: {
  userName: string;
  role: string;
}) {
  const pathname = usePathname();
  const initials = userName.slice(0, 2).toUpperCase();
  const roleLabel = roleLabels[role] ?? role;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[#0B1D4D] lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <HexLogo size={36} />
        <div className="leading-tight">
          <div className="text-lg font-bold text-white">Integra</div>
          <div className="text-[11px] text-slate-400">
            Gestión inteligente para centros educativos
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#2F6FED] text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden leading-tight">
            <div className="truncate text-sm font-semibold text-white">{userName}</div>
            <div className="truncate text-[11px] text-slate-400">{roleLabel}</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
