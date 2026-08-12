"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseBackup, RotateCcw, Clock, HardDrive, AlertTriangle, CheckCircle2 } from "lucide-react";
import { crearCopiaSeguridad, listarCopiasSeguridad, restaurarDesdeArchivo } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { AssemblingLogo } from "../components/AssemblingLogo";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Copia = { id: string; nombre: string; fecha: string | null; tamanoKB: number | null };

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BackupClient() {
  const router = useRouter();
  const { locale } = useLocale();
  const [copias, setCopias] = useState<Copia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [elegida, setElegida] = useState<Copia | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [restaurando, setRestaurando] = useState(false);

  async function cargar() {
    setCargando(true);
    const data = await listarCopiasSeguridad();
    setCopias(data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleCrear() {
    setCreando(true);
    setError(null);
    setExito(null);
    try {
      await crearCopiaSeguridad();
      setExito(translate(locale, "backup.copiaCreada"));
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la copia de seguridad.");
    } finally {
      setCreando(false);
    }
  }

  async function handleRestaurar() {
    if (!elegida) return;
    setRestaurando(true);
    setError(null);
    try {
      await restaurarDesdeArchivo(elegida.id);
      setElegida(null);
      setConfirmacion("");
      router.refresh();
      setExito(translate(locale, "backup.restauradoOk"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo restaurar la copia de seguridad.");
    } finally {
      setRestaurando(false);
    }
  }

  return (
    <div>
      {restaurando && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm">
          <AssemblingLogo size={140} />
          <p className="text-sm font-medium text-slate-500">{translate(locale, "backup.restaurando")}</p>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
      {exito && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {exito}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
            <DatabaseBackup className="h-5 w-5 text-[#FD5249]" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">{translate(locale, "backup.crearTitulo")}</h3>
          <p className="mt-1 text-xs text-slate-500">{translate(locale, "backup.crearAyuda")}</p>
          <button
            onClick={handleCrear}
            disabled={creando}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
          >
            {creando ? <ButtonSpinner /> : <DatabaseBackup className="h-4 w-4" />}
            {translate(locale, "backup.crearBoton")}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <RotateCcw className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">{translate(locale, "backup.restaurarTitulo")}</h3>
          <p className="mt-1 text-xs text-slate-500">{translate(locale, "backup.restaurarAyuda")}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#0B1D4D]">
          <Clock className="h-4 w-4 text-[#FD5249]" /> {translate(locale, "backup.copiasDisponibles")}
        </h3>

        {cargando ? (
          <p className="py-8 text-center text-xs text-slate-400">{translate(locale, "backup.cargando")}</p>
        ) : copias.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-8 text-center text-xs text-slate-400">{translate(locale, "backup.sinCopias")}</p>
        ) : (
          <div className="space-y-2">
            {copias.map((c) => (
              <div
                key={c.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 ${
                  elegida?.id === c.id ? "border-[#FD5249] bg-red-50" : "border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <HardDrive className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{formatFecha(c.fecha)}</p>
                    <p className="text-xs text-slate-400">
                      {c.nombre}
                      {c.tamanoKB ? ` · ${c.tamanoKB} KB` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setElegida(c);
                    setConfirmacion("");
                    setError(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]"
                >
                  {translate(locale, "backup.elegirEsta")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {elegida && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-5 w-5 text-[#FD5249]" />
            </div>
            <h3 className="text-base font-bold text-[#0B1D4D]">{translate(locale, "backup.confirmarTitulo")}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {translate(locale, "backup.confirmarTexto1")} <strong>{formatFecha(elegida.fecha)}</strong>.{" "}
              {translate(locale, "backup.confirmarTexto2")}
            </p>
            <p className="mt-3 text-xs text-slate-400">{translate(locale, "backup.confirmarEscribe")}</p>
            <input
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder="RESTAURAR"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setElegida(null);
                  setConfirmacion("");
                }}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                {translate(locale, "common.cancelar")}
              </button>
              <button
                onClick={handleRestaurar}
                disabled={confirmacion !== "RESTAURAR" || restaurando}
                className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-40"
              >
                {translate(locale, "backup.restaurarBoton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
