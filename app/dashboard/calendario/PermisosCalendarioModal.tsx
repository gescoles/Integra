"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search } from "lucide-react";
import { actualizarPermisoCalendarioEscolar } from "./escolarActions";
import type { ProfesorPermiso } from "./CalendarioEscolarClient";

export function PermisosCalendarioModal({
  profesores,
  onClose,
}: {
  profesores: ProfesorPermiso[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return profesores;
    return profesores.filter(
      (p) => (p.name ?? "").toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }, [profesores, busqueda]);

  async function handleToggle(userId: string, actual: boolean) {
    setPendingUserId(userId);
    try {
      await actualizarPermisoCalendarioEscolar(userId, !actual);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo cambiar el permiso.");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">Permisos de edición</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-xs text-slate-400">
          Por defecto solo SuperAdmin puede modificar el calendario escolar. Activa el interruptor para dar
          permiso de edición a un usuario concreto de este centro.
        </p>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar profesor por nombre o email..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>

        <div className="max-h-96 space-y-1.5 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Ningún usuario coincide con la búsqueda.</p>
          ) : (
            filtrados.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-700">{p.name ?? p.email}</div>
                  <div className="truncate text-xs text-slate-400">{p.email}</div>
                </div>
                <button
                  onClick={() => handleToggle(p.id, p.puedeEditarCalendarioEscolar)}
                  disabled={pendingUserId === p.id}
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-60 ${
                    p.puedeEditarCalendarioEscolar ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      p.puedeEditarCalendarioEscolar ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
