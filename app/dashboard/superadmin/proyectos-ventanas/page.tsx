import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../../components/DashboardHeader";
import { VentanasAdminClient } from "./VentanasAdminClient";
import { obtenerVentanas } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProyectosVentanasPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user.name || session?.user.email.split("@")[0] || "SuperAdmin";

  if (session?.user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const ventanasRaw = await obtenerVentanas();
  const ventanas = ventanasRaw.map((v) => ({ id: v.id, nombre: v.nombre, numProyectos: v._count.proyectos }));

  return (
    <div>
      <DashboardHeader
        title="Ventanas de Proyectos"
        subtitle="Las pestañas que salen dentro del módulo de Proyectos, como 'Projecte Intermodular'. Todas comparten exactamente los mismos campos — esto solo controla cuántas hay y cómo se llaman."
        userName={userName}
        role="SUPERADMIN"
      />
      <VentanasAdminClient ventanas={ventanas} />
    </div>
  );
}
