import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardHeader } from "../components/DashboardHeader";
import { Settings } from "lucide-react";

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "SuperAdmin";
  const role = session?.user.role ?? "SUPERADMIN";

  return (
    <div>
      <DashboardHeader
        title="Configuración"
        subtitle="Ajustes generales de la plataforma."
        userName={userName}
        role={role}
      />
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
        <Settings className="h-10 w-10 text-slate-300" />
        <h2 className="mt-4 text-lg font-semibold text-slate-500">
          Próximamente
        </h2>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          Aquí podrás configurar los ajustes generales de Integra.
        </p>
      </div>
    </div>
  );
}
