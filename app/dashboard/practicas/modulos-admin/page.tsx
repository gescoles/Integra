import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../../components/DashboardHeader";
import { ModulosAdminClient } from "./ModulosAdminClient";
import { obtenerCatalogoCompleto } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ModulosAdminPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "PROFESOR";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";

  if (role !== "SUPERADMIN") redirect("/dashboard/practicas");

  const modulos = await obtenerCatalogoCompleto();

  return (
    <div>
      <DashboardHeader
        title="Catálogo de módulos profesionales"
        subtitle="Gestiona manualmente los módulos y las horas de cada ciclo formativo"
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <ModulosAdminClient modulos={modulos} />
    </div>
  );
}
