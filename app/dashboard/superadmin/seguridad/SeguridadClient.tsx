"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Unlock, KeyRound, Mail, Power, AlertTriangle, Clock, Laptop, LogIn, FileSpreadsheet } from "lucide-react";
import { ButtonSpinner } from "../../components/ButtonSpinner";
import {
  desbloquearAccesoAhora,
  cambiarEstadoUsuarioDesdeSeguridad,
  regenerarPasswordDesdeSeguridad,
  reenviarInvitacionTeamsDesdeSeguridad,
} from "./actions";

type Acceso = {
  id: string;
  email: string;
  cantidad: number;
  ultimoIntento: string;
  estado: "PENDIENTE" | "RESUELTO";
  resueltoPorNombre: string | null;
  accionResolucion: string | null;
  resueltoEn: string | null;
  usuario: { id: string; email: string; name: string | null; role: string; status: string; schoolId: string | null } | null;
};

type RegistroAccesoRow = {
  id: string;
  userId: string | null;
  email: string;
  nombre: string;
  metodo: string;
  createdAt: string;
  rol: string | null;
  centro: string | null;
};

export function SeguridadClient({ accesos, registroAccesos }: { accesos: Acceso[]; registroAccesos: RegistroAccesoRow[] }) {
  const router = useRouter();
  const [vista, setVista] = useState<"bloqueados" | "historial">("bloqueados");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [passwordManualPor, setPasswordManualPor] = useState<Record<string, string>>({});

  async function conManejoDeErrores(email: string, accion: () => Promise<void>, mensajeExito: string) {
    setPendingEmail(email);
    setError(null);
    setExito(null);
    try {
      await accion();
      setExito(mensajeExito);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setPendingEmail(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm" style={{ width: "fit-content" }}>
          <button
            onClick={() => setVista("bloqueados")}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${vista === "bloqueados" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
          >
            Accesos bloqueados
          </button>
          <button
            onClick={() => setVista("historial")}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${vista === "historial" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
          >
            Historial de accesos
          </button>
        </div>
        <a
          href="/api/superadmin/exportar-accesos"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
        >
          <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel
        </a>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
      {exito && <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{exito}</div>}

      {vista === "bloqueados" && (
      <>
      {accesos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">Todavía no se ha registrado ningún bloqueo de acceso.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accesos.map((a) => {
            const pendiente = a.estado === "PENDIENTE";
            return (
            <div key={a.id} className={`rounded-2xl border bg-white p-4 ${pendiente ? "border-red-200" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${pendiente ? "bg-red-50" : "bg-emerald-50"}`}>
                    <AlertTriangle className={`h-5 w-5 ${pendiente ? "text-red-500" : "text-emerald-500"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">{a.email}</p>
                    <p className="text-xs text-slate-400">
                      {a.cantidad} intento(s) fallido(s) · último: {new Date(a.ultimoIntento).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      <span className={`font-semibold ${pendiente ? "text-red-600" : "text-emerald-600"}`}>
                        {pendiente ? "PENDIENTE" : "RESUELTO"}
                      </span>
                    </p>
                    {a.usuario && (
                      <p className="text-xs text-slate-400">
                        {a.usuario.name ?? a.usuario.email} · {a.usuario.role} · estado actual: <strong>{a.usuario.status}</strong>
                      </p>
                    )}
                    {!a.usuario && <p className="text-xs text-slate-400">Este correo no corresponde a ningún usuario del sistema.</p>}
                    {!pendiente && (
                      <p className="text-xs text-slate-400">
                        Resuelto por <strong>{a.resueltoPorNombre}</strong> ({a.accionResolucion})
                        {a.resueltoEn && <> · {new Date(a.resueltoEn).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</>}
                      </p>
                    )}
                  </div>
                </div>

                {pendiente && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={pendingEmail === a.email}
                    onClick={() => conManejoDeErrores(a.email, () => desbloquearAccesoAhora(a.email), "Acceso desbloqueado.")}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
                  >
                    <Unlock className="h-3.5 w-3.5" /> Desbloquear ahora
                  </button>

                  {a.usuario && (
                    <>
                      <button
                        disabled={pendingEmail === a.email}
                        onClick={() =>
                          conManejoDeErrores(
                            a.email,
                            () => cambiarEstadoUsuarioDesdeSeguridad(a.usuario!.id, a.usuario!.status !== "ACTIVO"),
                            a.usuario!.status === "ACTIVO" ? "Usuario desactivado." : "Usuario activado."
                          )
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]"
                      >
                        <Power className="h-3.5 w-3.5" /> {a.usuario.status === "ACTIVO" ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        disabled={pendingEmail === a.email}
                        onClick={() =>
                          conManejoDeErrores(a.email, () => regenerarPasswordDesdeSeguridad(a.usuario!.id, "auto"), "Contraseña generada y enviada por correo.")
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Contraseña automática
                      </button>
                      <button
                        disabled={pendingEmail === a.email}
                        onClick={() =>
                          conManejoDeErrores(a.email, () => reenviarInvitacionTeamsDesdeSeguridad(a.usuario!.id), "Invitación de Microsoft/Teams reenviada.")
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                      >
                        <Mail className="h-3.5 w-3.5" /> Reenviar invitación Teams
                      </button>
                    </>
                  )}
                </div>
                )}
              </div>

              {pendiente && a.usuario && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <input
                    type="text"
                    value={passwordManualPor[a.email] ?? ""}
                    onChange={(e) => setPasswordManualPor((p) => ({ ...p, [a.email]: e.target.value }))}
                    placeholder="Escribir una contraseña manual (mínimo 8 caracteres)"
                    className="w-72 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-[#FD5249]"
                  />
                  <button
                    disabled={pendingEmail === a.email || (passwordManualPor[a.email] ?? "").length < 8}
                    onClick={() =>
                      conManejoDeErrores(
                        a.email,
                        () => regenerarPasswordDesdeSeguridad(a.usuario!.id, "manual", passwordManualPor[a.email]),
                        "Contraseña manual guardada y enviada por correo."
                      )
                    }
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    {pendingEmail === a.email ? <ButtonSpinner /> : "Enviar esta"}
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {vista === "historial" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          {registroAccesos.length === 0 ? (
            <div className="py-24 text-center">
              <LogIn className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">Todavía no hay ningún acceso registrado.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="px-4 py-3 font-medium">Quién</th>
                  <th className="px-4 py-3 font-medium">Rol / Centro</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {registroAccesos.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{r.nombre}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.rol ?? "—"}
                      {r.centro && <span className="text-slate-400"> · {r.centro}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.metodo === "microsoft" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600"}`}>
                        {r.metodo === "microsoft" ? <Laptop className="h-3 w-3" /> : <KeyRound className="h-3 w-3" />}
                        {r.metodo === "microsoft" ? "Microsoft / Teams" : "Contraseña"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-300" />
                        {new Date(r.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
