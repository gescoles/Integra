import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardHeader } from "../../components/DashboardHeader";
import { obtenerEmpresa } from "../actions";
import { EmpresaFichaClient } from "./EmpresaFichaClient";

export default async function EmpresaFichaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userName = session.user.name || session.user.email.split("@")[0];
  const role = session.user.role;
  const puedeEditar = role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";

  const empresa = await obtenerEmpresa(params.id);

  if (!empresa) {
    return (
      <div>
        <DashboardHeader title="Ficha de empresa" subtitle="Consulta toda la información de la empresa colaboradora" userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          No se ha encontrado esta empresa.
        </div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Ficha de empresa" subtitle="Consulta toda la información de la empresa colaboradora y su relación con los ciclos formativos del centro." userName={userName} role={role} />
      <EmpresaFichaClient empresa={empresa} puedeEditar={puedeEditar} schoolId={searchParams.school} />
    </div>
  );
}
