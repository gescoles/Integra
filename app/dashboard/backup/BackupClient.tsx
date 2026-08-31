"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseBackup, RotateCcw, Clock, HardDrive, AlertTriangle, CheckCircle2 } from "lucide-react";
import { crearCopiaSeguridad, crearCopiaExcelModulos, listarCopiasSeguridad, restaurarDesdeArchivo, crearBackupBaseDatosInstantaneo, listarBackupsCentro, restaurarBackupCentro } from "./actions";
import { actualizarLoginPasswordHabilitado } from "../configuracion/actions";
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

export function BackupClient({
  schools,
  loginPasswordHabilitadoInicial,
}: {
  schools: { id: string; name: string }[];
  loginPasswordHabilitadoInicial: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [copias, setCopias] = useState<Copia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [creandoExcel, setCreandoExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [centroElegido, setCentroElegido] = useState(schools[0]?.id ?? "");
  const [creandoBBDD, setCreandoBBDD] = useState(false);
  const [backupsCentro, setBackupsCentro] = useState<Copia[]>([]);
  const [cargandoBackupsCentro, setCargandoBackupsCentro] = useState(false);
  const [elegidaCentro, setElegidaCentro] = useState<Copia | null>(null);
  const [confirmacionCentro, setConfirmacionCentro] = useState("");
  const [restaurandoCentro, setRestaurandoCentro] = useState(false);
  const [loginPasswordHabilitado, setLoginPasswordHabilitado] = useState(loginPasswordHabilitadoInicial);
  const [cambiandoInterruptor, setCambiandoInterruptor] = useState(false);

  async function handleToggleLoginPassword() {
    const nuevoValor = !loginPasswordHabilitado;
    setCambiandoInterruptor(true);
    setError(null);
    try {
      await actualizarLoginPasswordHabilitado(nuevoValor);
      setLoginPasswordHabilitado(nuevoValor);
      setExito(nuevoValor ? "Recuperar contraseña activado para todo el mundo." : "Recuperar contraseña bloqueado de nuevo para todos menos el SuperAdmin.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el ajuste.");
    } finally {
      setCambiandoInterruptor(false);
    }
  }

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

  async function cargarBackupsCentro() {
    if (!centroElegido) return;
    setCargandoBackupsCentro(true);
    const data = await listarBackupsCentro(centroElegido);
    setBackupsCentro(data);
    setCargandoBackupsCentro(false);
  }

  useEffect(() => {
    cargarBackupsCentro();
  }, [centroElegido]);

  async function handleRestaurarCentro() {
    if (!elegidaCentro || !centroElegido) return;
    setRestaurandoCentro(true);
    setError(null);
    try {
      await restaurarBackupCentro(centroElegido, elegidaCentro.id);
      setElegidaCentro(null);
      setConfirmacionCentro("");
      router.refresh();
      setExito(`Se han restaurado los datos de este centro, sin tocar los demás. Se guardó una copia del estado anterior en .json y .sql, por si hiciera falta deshacerlo.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo restaurar la copia de este centro.");
    } finally {
      setRestaurandoCentro(false);
    }
  }

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

  async function handleCrearExcel() {
    setCreandoExcel(true);
    setError(null);
    setExito(null);
    try {
      const resultados = await crearCopiaExcelModulos();
      const fallidos = resultados.filter((r) => !r.ok);
      if (fallidos.length > 0) {
        setError(`Se ha completado con algún fallo: ${fallidos.map((f) => f.centro).join(", ")}.`);
      } else {
        setExito("Copia en Excel por módulos guardada en Drive correctamente.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la copia en Excel.");
    } finally {
      setCreandoExcel(false);
    }
  }

  async function handleCrearBBDD() {
    if (!centroElegido) return;
    setCreandoBBDD(true);
    setError(null);
    setExito(null);
    try {
      const { nombre } = await crearBackupBaseDatosInstantaneo(centroElegido);
      setExito(`Copia de este centro guardada en Drive: "${nombre}" (y su .json de reserva al lado).`);
      await cargarBackupsCentro();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el backup de la base de datos.");
    } finally {
      setCreandoBBDD(false);
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

      {restaurandoCentro && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm">
          <AssemblingLogo size={140} />
          <p className="text-sm font-medium text-slate-500">Restaurando este centro...</p>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
      {exito && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {exito}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-sm font-bold text-[#0B1D4D]">Recuperar contraseña (acceso de emergencia)</h3>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            El login con email y contraseña funciona siempre con normalidad (si alguien tiene una contraseña que le hayas generado y enviado tú, puede entrar sin más). Lo que sí queda bloqueado por defecto es "¿Has olvidado tu contraseña?" — solo el SuperAdmin puede usarlo hasta que lo actives aquí para todo el mundo, por si Microsoft/Teams fallara y hiciera falta un plan B general.
          </p>
        </div>
        <button
          onClick={handleToggleLoginPassword}
          disabled={cambiandoInterruptor}
          className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            loginPasswordHabilitado ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              loginPasswordHabilitado ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <DatabaseBackup className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">Backup BBDD instantáneo</h3>
          <p className="mt-1 text-xs text-slate-500">
            Copia solo de los datos de este centro (alumnos, profesorado, guardias, prácticas, empresas, todo lo suyo). Se guarda en dos carpetas separadas en Drive: &quot;Backup BBDD JSON&quot; (el que sabe usar el botón Restaurar de aquí abajo) y &quot;Backup BBDD SQL&quot; (para ejecutarlo tú mismo en Supabase). Los manuales llevan &quot;manual&quot; en el nombre; los de cada noche, &quot;automatico&quot;. No incluye datos de otros centros.
          </p>
          <div className="mt-auto pt-3">
            <select
              value={centroElegido}
              onChange={(e) => setCentroElegido(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#FD5249]"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={handleCrearBBDD}
              disabled={creandoBBDD || !centroElegido}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creandoBBDD ? <ButtonSpinner /> : <DatabaseBackup className="h-4 w-4" />}
              {creandoBBDD ? "Generando..." : "Copiar BBDD ahora"}
            </button>
          </div>

          {centroElegido && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">Copias de este centro:</p>
              {cargandoBackupsCentro ? (
                <p className="text-xs text-slate-400">Cargando...</p>
              ) : backupsCentro.length === 0 ? (
                <p className="text-xs text-slate-400">Todavía no hay ninguna copia de este centro.</p>
              ) : (
                <div className="space-y-1.5">
                  {backupsCentro.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5">
                      <span className="truncate text-xs text-slate-500">{formatFecha(c.fecha)}</span>
                      <button
                        onClick={() => {
                          setElegidaCentro(c);
                          setConfirmacionCentro("");
                          setError(null);
                        }}
                        className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600"
                      >
                        Restaurar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
            <DatabaseBackup className="h-5 w-5 text-[#FD5249]" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">{translate(locale, "backup.crearTitulo")}</h3>
          <p className="mt-1 text-xs text-slate-500">{translate(locale, "backup.crearAyuda")}</p>
          <button
            onClick={handleCrear}
            disabled={creando}
            className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
          >
            {creando ? <ButtonSpinner /> : <DatabaseBackup className="h-4 w-4" />}
            {translate(locale, "backup.crearBoton")}
          </button>
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <HardDrive className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">Copia en Excel por módulos</h3>
          <p className="mt-1 text-xs text-slate-500">
            Un Excel por módulo (Tutorías, Material, Salidas, Prácticas, Certificaciones), guardado en Drive con una carpeta por centro y por fecha — lo mismo que se hace solo cada noche.
          </p>
          <button
            onClick={handleCrearExcel}
            disabled={creandoExcel}
            className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {creandoExcel ? <ButtonSpinner /> : <HardDrive className="h-4 w-4" />}
            {creandoExcel ? "Generando..." : "Copiar en Excel ahora"}
          </button>
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
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

      {elegidaCentro && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-[#0B1D4D]">Restaurar solo este centro</h3>
            <p className="mt-2 text-sm text-slate-500">
              Se van a borrar y reponer los datos de este centro a como estaban el <strong>{formatFecha(elegidaCentro.fecha)}</strong>.{" "}
              Los demás centros no se tocan para nada. Se guarda una copia del estado actual de este centro (en .json y .sql) antes de restaurar, por si hiciera falta deshacerlo.
            </p>
            <p className="mt-3 text-xs text-slate-400">Para confirmar, escribe RESTAURAR CENTRO:</p>
            <input
              value={confirmacionCentro}
              onChange={(e) => setConfirmacionCentro(e.target.value)}
              placeholder="RESTAURAR CENTRO"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setElegidaCentro(null);
                  setConfirmacionCentro("");
                }}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestaurarCentro}
                disabled={confirmacionCentro !== "RESTAURAR CENTRO" || restaurandoCentro}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {restaurandoCentro ? "Restaurando..." : "Restaurar este centro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
