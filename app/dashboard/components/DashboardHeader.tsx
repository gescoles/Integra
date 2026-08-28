"use client";

export function DashboardHeader({
  title,
  subtitle,
  cuentaInactiva = false,
}: {
  title: string;
  subtitle: string;
  userName?: string;
  role?: string;
  notificationCount?: number;
  cuentaInactiva?: boolean;
}) {
  return (
    <div className="mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D4D]">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {cuentaInactiva && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Tu cuenta está inactiva. Ponte en contacto con el administrador de tu centro para poder volver a usar Docentium con normalidad.
        </div>
      )}
    </div>
  );
}
