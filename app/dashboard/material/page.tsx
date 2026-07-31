import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { ModuleLocked } from "../components/ModuleLocked";
import { MaterialClient } from "./MaterialClient";
import { MaterialFormModal } from "./MaterialFormModal";

export default async function MaterialPage() {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";
  const schoolId = session?.user.schoolId ?? null;
  const userId = session?.user.id;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title="Material"
          subtitle="Material didáctico del centro."
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario no tiene un centro asignado todavía.
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { modules: true },
  });

  if (!school?.modules.includes("material")) {
    return (
      <div>
        <DashboardHeader
          title="Material"
          subtitle="Material didáctico del centro."
          userName={userName}
          role={role}
        />
        <ModuleLocked moduleName="Material" />
      </div>
    );
  }

  if (!userId) return null;

  const materialRaw = await prisma.materialRequest.findMany({
    where: { profesorId: userId },
    include: { profesor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = materialRaw.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    curso: m.curso,
    asignatura: m.asignatura,
    cantidad: m.cantidad,
    precioUnidad: m.precioUnidad,
    proveedor: m.proveedor,
    enlace: m.enlace,
    categoria: m.categoria,
    estado: m.estado,
    justificacion: m.justificacion,
    profesorId: m.profesorId,
    profesorName: m.profesor?.name ?? m.profesor?.email ?? "—",
  }));

  return (
    <div>
      <DashboardHeader
        title="Material"
        subtitle="El material didáctico que has pedido."
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <div className="mb-5 flex justify-end">
        <MaterialFormModal userName={userName} />
      </div>
      <MaterialClient rows={rows} currentUserId={userId} />
    </div>
  );
}
