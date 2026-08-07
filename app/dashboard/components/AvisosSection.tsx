import { prisma } from "@/lib/prisma";
import { Megaphone, Calendar, AlertTriangle } from "lucide-react";
import { NuevoAvisoButton } from "./NuevoAvisoButton";

const CATEGORIA_CONFIG: Record<string, { label: string; color: string; icon: typeof Megaphone }> = {
  GENERAL: { label: "General", color: "bg-blue-50 text-[#FD5249]", icon: Megaphone },
  ACADEMICO: { label: "Académico", color: "bg-emerald-50 text-emerald-600", icon: Calendar },
  CONVIVENCIA: { label: "Convivencia", color: "bg-amber-50 text-amber-600", icon: AlertTriangle },
};

export async function AvisosSection({
  schoolId,
  canCreate,
}: {
  schoolId: string;
  canCreate: boolean;
}) {
  const avisos = await prisma.aviso.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0B1D4D]">Avisos del centro</h3>
        {canCreate && <NuevoAvisoButton />}
      </div>

      {avisos.length === 0 ? (
        <p className="text-sm text-slate-400">No hay avisos publicados todavía.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avisos.map((a) => {
            const config = CATEGORIA_CONFIG[a.categoria];
            return (
              <div key={a.id} className="rounded-xl border border-slate-100 p-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${config.color}`}
                >
                  <config.icon className="h-3 w-3" />
                  {config.label}
                </span>
                <h4 className="mt-2 text-sm font-semibold text-slate-700">{a.titulo}</h4>
                <p className="mt-1 text-xs text-slate-500">{a.cuerpo}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {a.createdAt.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
