import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../components/DashboardHeader";
import { obtenerNoticiasAdmin, obtenerCentrosParaSelector } from "./actions";
import { NoticiasAdminClient } from "./NoticiasAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NoticiasAdminPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user.name || session?.user.email.split("@")[0] || "SuperAdmin";

  if (session?.user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const [noticias, centros] = await Promise.all([obtenerNoticiasAdmin(), obtenerCentrosParaSelector()]);

  return (
    <div>
      <DashboardHeader
        title="Noticias"
        subtitle="Publica noticias y novedades de cada centro en la web pública de Docentium."
        userName={userName}
        role="SUPERADMIN"
      />
      <NoticiasAdminClient noticias={noticias} centros={centros} />
    </div>
  );
}
