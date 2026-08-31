import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../../components/DashboardHeader";
import { CatalogoAdminClient } from "./CatalogoAdminClient";
import { obtenerCatalogoCompleto, obtenerCategoriasDisponibles, obtenerCentrosDisponibles } from "./actions";

export const dynamic = "force-dynamic";

export default async function CertificacionesCatalogoPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "PROFESOR";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";

  if (role !== "SUPERADMIN") redirect("/dashboard");

  const [catalogo, categorias, centros] = await Promise.all([obtenerCatalogoCompleto(), obtenerCategoriasDisponibles(), obtenerCentrosDisponibles()]);

  return (
    <div>
      <DashboardHeader
        title="Catálogo de certificaciones"
        subtitle="Los cursos que salen a elegir en cada categoría, con toda su información, para todos los centros de la plataforma."
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <CatalogoAdminClient catalogo={catalogo} categorias={categorias} centros={centros} />
    </div>
  );
}
