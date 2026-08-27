"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { crearModuloProfesional, actualizarModuloProfesional, eliminarModuloProfesional, obtenerCiclosDelCentro } from "../actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";

type Modulo = {
  id: string;
  cicloFormativo: string;
  codigo: string;
  nombre: string;
  horasCentro: number;
  horasEmpresa: number;
  orden: number;
};

export function ModulosAdminClient({ modulos }: { modulos: Modulo[] }) {
  const router = useRouter();
  const [nuevoOpen, setNuevoOpen] = useState(false);

  const porCiclo = useMemo(() => {
    const grupos = new Map<string, Modulo[]>();
    for (const m of modulos) {
      if (!grupos.has(m.cicloFormativo)) grupos.set(m.cicloFormativo, []);
      grupos.get(m.cicloFormativo)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [modulos]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setNuevoOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
        >
          <Plus className="h-4 w-4" /> Nou mòdul
        </button>
      </div>

      {porCiclo.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
          Encara no hi ha cap mòdul carregat. Crea&apos;n un o utilitza el botó &quot;Carregar catàleg de mòduls&quot; de Pràctiques per als tres cicles per defecte.
        </div>
      ) : (
        porCiclo.map(([ciclo, mods]) => (
          <div key={ciclo} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-base font-bold text-[#0B1D4D]">{ciclo}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400">
                    <th className="pb-2 pr-3 font-medium">Código</th>
                    <th className="pb-2 pr-3 font-medium">Nombre del módulo</th>
                    <th className="pb-2 pr-3 font-medium">Horas centro</th>
                    <th className="pb-2 pr-3 font-medium">Horas empresa</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {mods.map((m) => (
                    <ModuloRow key={m.id} modulo={m} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {nuevoOpen && <NuevoModuloModal onClose={() => setNuevoOpen(false)} />}
    </div>
  );
}

function ModuloRow({ modulo }: { modulo: Modulo }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(modulo.nombre);
  const [horasCentro, setHorasCentro] = useState(modulo.horasCentro);
  const [horasEmpresa, setHorasEmpresa] = useState(modulo.horasEmpresa);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("id", modulo.id);
      fd.set("nombre", nombre);
      fd.set("horasCentro", String(horasCentro));
      fd.set("horasEmpresa", String(horasEmpresa));
      await actualizarModuloProfesional(fd);
      router.refresh();
      setEditando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  async function handleEliminar() {
    if (!confirm(`Eliminar el mòdul ${modulo.codigo} - ${modulo.nombre}?`)) return;
    setPending(true);
    try {
      await eliminarModuloProfesional(modulo.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (editando) {
    return (
      <tr className="border-b border-slate-50 bg-orange-50/30">
        <td className="py-2 pr-3 text-slate-400">{modulo.codigo}</td>
        <td className="py-2 pr-3">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-[#FD5249]" />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </td>
        <td className="py-2 pr-3">
          <input type="number" min={0} value={horasCentro} onChange={(e) => setHorasCentro(Number(e.target.value))} className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-[#FD5249]" />
        </td>
        <td className="py-2 pr-3">
          <input type="number" min={0} value={horasEmpresa} onChange={(e) => setHorasEmpresa(Number(e.target.value))} className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-[#FD5249]" />
        </td>
        <td className="py-2">
          <div className="flex items-center gap-1">
            <button onClick={handleGuardar} disabled={pending} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50">
              {pending ? <ButtonSpinner /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setEditando(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-50">
      <td className="py-2 pr-3 text-slate-400">{modulo.codigo}</td>
      <td className="py-2 pr-3 text-slate-700">{modulo.nombre}</td>
      <td className="py-2 pr-3 text-slate-500">{modulo.horasCentro}h</td>
      <td className="py-2 pr-3 text-slate-500">{modulo.horasEmpresa}h</td>
      <td className="py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setEditando(true)} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#FD5249]">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleEliminar} disabled={pending} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NuevoModuloModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ciclos, setCiclos] = useState<string[]>([]);

  useEffect(() => {
    obtenerCiclosDelCentro().then(setCiclos);
  }, []);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await crearModuloProfesional(formData);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">Nuevo módulo profesional</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Ciclo <span className="text-red-500">*</span>
            </label>
            {ciclos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">
                El centro todavía no tiene ningún grupo configurado en &quot;Grupos&quot;.
              </p>
            ) : (
              <select
                name="cicloFormativo"
                required
                defaultValue=""
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              >
                <option value="" disabled>Elige un ciclo...</option>
                {ciclos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              Es mostren els cicles reals del centre (a partir dels grups de &quot;Grups&quot;, sense el número: SIMIX1/SIMIX2 → SIMIX).
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Codi <span className="text-red-500">*</span>
              </label>
              <input name="codigo" required placeholder="0485" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
            </div>
            <div />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Nom del mòdul <span className="text-red-500">*</span>
            </label>
            <input name="nombre" required placeholder="Programació." className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Hores al centre <span className="text-red-500">*</span>
              </label>
              <input name="horasCentro" type="number" min={0} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Hores a l&apos;empresa <span className="text-red-500">*</span>
              </label>
              <input name="horasEmpresa" type="number" min={0} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel·lar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending && <ButtonSpinner />}
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
