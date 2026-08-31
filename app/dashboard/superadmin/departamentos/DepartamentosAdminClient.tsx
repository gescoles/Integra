"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, ChevronDown, ChevronUp } from "lucide-react";
import { crearDepartamento, actualizarCiclosDepartamento } from "../../usuarios/departamentosActions";
import { ButtonSpinner } from "../../components/ButtonSpinner";

type Departamento = {
  id: string;
  nombre: string;
  ciclosVinculados: string[];
  coordinadores: { id: string; nombre: string }[];
};

export function DepartamentosAdminClient({
  schools,
  schoolId,
  departamentos,
  ciclosDelCentro,
}: {
  schools: { id: string; name: string }[];
  schoolId: string | null;
  departamentos: Departamento[];
  ciclosDelCentro: string[];
}) {
  const router = useRouter();
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [seleccionPorDepto, setSeleccionPorDepto] = useState<Record<string, string[]>>(() => {
    const inicial: Record<string, string[]> = {};
    departamentos.forEach((d) => (inicial[d.id] = d.ciclosVinculados));
    return inicial;
  });
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  function cambiarCentro(id: string) {
    router.push(`/dashboard/superadmin/departamentos?school=${id}`);
  }

  function toggleAbierto(id: string) {
    setAbiertoId(abiertoId === id ? null : id);
  }

  function toggleCiclo(deptoId: string, ciclo: string) {
    setSeleccionPorDepto((prev) => {
      const actuales = prev[deptoId] ?? [];
      const nuevos = actuales.includes(ciclo) ? actuales.filter((c) => c !== ciclo) : [...actuales, ciclo];
      return { ...prev, [deptoId]: nuevos };
    });
  }

  async function handleCrear() {
    if (!nuevoNombre.trim() || !schoolId) return;
    setCreando(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("schoolId", schoolId);
      formData.set("nombre", nuevoNombre.trim());
      await crearDepartamento(formData);
      setNuevoNombre("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el departamento.");
    } finally {
      setCreando(false);
    }
  }

  async function handleGuardar(deptoId: string) {
    setGuardandoId(deptoId);
    setError(null);
    try {
      await actualizarCiclosDepartamento(deptoId, seleccionPorDepto[deptoId] ?? []);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los ciclos.");
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold text-slate-600">Centro:</label>
        <select
          value={schoolId ?? ""}
          onChange={(e) => cambiarCentro(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
        >
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="mb-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre del nuevo departamento..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
        />
        <button
          onClick={handleCrear}
          disabled={creando || !nuevoNombre.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
        >
          {creando ? <ButtonSpinner /> : <Plus className="h-4 w-4" />}
          Crear departamento
        </button>
      </div>

      <div className="space-y-3">
        {departamentos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
            Este centro todavía no tiene ningún departamento creado.
          </div>
        ) : (
          departamentos.map((d) => {
            const seleccionados = seleccionPorDepto[d.id] ?? [];
            const abierto = abiertoId === d.id;
            return (
              <div key={d.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button
                  onClick={() => toggleAbierto(d.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-bold text-[#0B1D4D]">{d.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {seleccionados.length === 0
                        ? "Sin ciclos vinculados todavía (se muestran todos por defecto)"
                        : `${seleccionados.length} ciclo(s) vinculado(s)`}
                    </p>
                  </div>
                  {abierto ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {abierto && (
                  <div className="border-t border-slate-100 p-5">
                    {ciclosDelCentro.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        Este centro todavía no tiene ningún grupo/ciclo configurado en &quot;Grupos&quot;.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {ciclosDelCentro.map((c) => (
                            <button
                              key={c}
                              onClick={() => toggleCiclo(d.id, c)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                seleccionados.includes(c) ? "border-[#FD5249] bg-red-50 text-[#FD5249]" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleGuardar(d.id)}
                          disabled={guardandoId === d.id}
                          className="mt-4 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {guardandoId === d.id ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
                          Guardar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
