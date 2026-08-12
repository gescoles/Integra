import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { Building2, Users, Mail } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MiDepartamentoPage() {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email?.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";

  if (role !== "COORDINADOR" || !session?.user.id) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "nav.miDepartamento")}
          subtitle={translate(locale, "miDepartamento.subtitle")}
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "miDepartamento.soloCoordinadores")}
        </div>
      </div>
    );
  }

  const departamentos = await prisma.departamento.findMany({
    where: { coordinadores: { some: { id: session.user.id } } },
    include: {
      profesores: {
        select: { id: true, name: true, email: true, avatarUrl: true },
        orderBy: { name: "asc" },
      },
      coordinadores: {
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { nombre: "asc" },
  });

  const totalProfesores = new Set(departamentos.flatMap((d) => d.profesores.map((p) => p.id))).size;

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "nav.miDepartamento")}
        subtitle={translate(locale, "miDepartamento.subtitle")}
        userName={userName}
        role={role}
        notificationCount={0}
      />

      {departamentos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "miDepartamento.sinDepartamentos")}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                  <Building2 className="h-4 w-4 text-[#FD5249]" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[#0B1D4D]">{departamentos.length}</div>
                  <div className="text-xs text-slate-400">{translate(locale, "miDepartamento.departamentos")}</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[#0B1D4D]">{totalProfesores}</div>
                  <div className="text-xs text-slate-400">{translate(locale, "miDepartamento.profesoresTotal")}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {departamentos.map((d) => (
              <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                      <Building2 className="h-5 w-5 text-[#FD5249]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#0B1D4D]">{d.nombre}</h2>
                      <p className="text-xs text-slate-400">
                        {d.profesores.length} {translate(locale, "miDepartamento.profesores")}
                      </p>
                    </div>
                  </div>
                  {d.coordinadores.length > 1 && (
                    <div className="text-xs text-slate-400">
                      {translate(locale, "miDepartamento.coordinadoTambienPor")}{" "}
                      <span className="font-semibold text-slate-600">
                        {d.coordinadores
                          .filter((c) => c.id !== session.user.id)
                          .map((c) => c.name ?? c.email)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {d.profesores.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                    {translate(locale, "miDepartamento.sinProfesores")}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {d.profesores.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                          {p.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-500">
                              {(p.name ?? p.email).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-700">{p.name ?? p.email}</div>
                          <div className="flex items-center gap-1 truncate text-[11px] text-slate-400">
                            <Mail className="h-3 w-3 shrink-0" /> {p.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
