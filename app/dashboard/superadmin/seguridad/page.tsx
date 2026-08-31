import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../../components/DashboardHeader";
import { SeguridadClient } from "./SeguridadClient";
import { obtenerAccesosBloqueados, obtenerRegistroAccesos } from "./actions";

export const dynamic = "force-dynamic";

export default async function SeguridadPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "PROFESOR";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";

  if (role !== "SUPERADMIN") redirect("/dashboard");

  const [accesos, registroAccesos] = await Promise.all([
    obtenerAccesosBloqueados(),
    obtenerRegistroAccesos(),
  ]);

  return (
    <div>
      <DashboardHeader
        title="Seguridad de accesos"
        subtitle="Intentos fallidos, accesos bloqueados, e historial de quién ha entrado y cuándo."
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <SeguridadClient accesos={accesos} registroAccesos={registroAccesos} />
    </div>
  );
}
