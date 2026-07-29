"use client";

import { Bell, Calendar, ChevronDown } from "lucide-react";

export function DashboardHeader({
  title,
  subtitle,
  userName,
  role,
  notificationCount = 0,
}: {
  title: string;
  subtitle: string;
  userName: string;
  role: string;
  notificationCount?: number;
}) {
  const initials = userName.slice(0, 2).toUpperCase();
  const roleLabel = role === "SUPERADMIN" ? "Super Usuario" : "Administrador de centro";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D4D]">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <Calendar className="h-4 w-4" />
          24 de mayo de 2025
          <ChevronDown className="h-4 w-4" />
        </button>

        <button className="relative rounded-lg border border-slate-200 bg-white p-2.5 hover:bg-slate-50">
          <Bell className="h-4 w-4 text-slate-500" />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {notificationCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
            {initials}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[#0B1D4D]">{userName}</div>
            <div className="text-[11px] text-slate-500">{roleLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
