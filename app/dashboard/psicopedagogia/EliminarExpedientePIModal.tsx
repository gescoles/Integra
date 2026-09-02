"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { eliminarAlumnoPI } from "./actions";

export function EliminarExpedientePIModal({
  alumnoNombre,
  alumnoPiId,
  onClose,
  onEliminado,
}: {
  alumnoNombre: string;
  alumnoPiId: string;
  onClose: () => void;
  onEliminado: () => void;
}) {
  const [paso, setPaso] = useState<"confirmar" | "escribir">("confirmar");
  const [texto, setTexto] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textoEsperado = `Eliminar ${alumnoNombre}`;

  async function handleEliminar() {
    setPending(true);
    setError(null);
    try {
      await eliminarAlumnoPI(alumnoPiId, texto);
      onEliminado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>

        {paso === "confirmar" ? (
          <>
            <h3 className="text-base font-bold text-[#0B1D4D]">¿Seguro que quieres eliminar el expediente de {alumnoNombre}?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Se borrará también todo lo suyo: actuaciones registradas, documentos adjuntos, y el PI si lo tenía (con sus firmas). Esto no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={() => setPaso("escribir")} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                Sí, quiero eliminarlo
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-bold text-[#0B1D4D]">Última confirmación</h3>
            <p className="mt-2 text-sm text-slate-500">
              Para eliminarlo, escribe exactamente: <strong>{textoEsperado}</strong>
            </p>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={textoEsperado}
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-500"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={pending || texto !== textoEsperado}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              >
                {pending ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
