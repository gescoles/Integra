"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseBackup, Clock, HardDrive, AlertTriangle, CheckCircle2 } from "lucide-react";
import { crearCopiaSeguridad, crearCopiaExcelModulos, listarCopiasSeguridad, restaurarDesdeArchivo, crearBackupBaseDatosInstantaneo, listarBackupsCentro, restaurarBackupCentro, obtenerDestinosBackupCentro, guardarDestinosBackupCentro } from "./actions";
import { actualizarLoginPasswordHabilitado, actualizarHistoriasEntreCentrosHabilitado } from "../configuracion/actions";
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
  historiasEntreCentrosHabilitadoInicial,
}: {
  schools: { id: string; name: string }[];
  loginPasswordHabilitadoInicial: boolean;
  historiasEntreCentrosHabilitadoInicial: boolean;
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
  const [pestanaBackup, setPestanaBackup] = useState<"instantaneo" | "manual" | "excel" | "restaurarWeb" | "destinos">("instantaneo");
  const [creandoBBDD, setCreandoBBDD] = useState(false);
  const [backupsCentro, setBackupsCentro] = useState<Copia[]>([]);
  const [cargandoBackupsCentro, setCargandoBackupsCentro] = useState(false);
  const [elegidaCentro, setElegidaCentro] = useState<Copia | null>(null);
  const [confirmacionCentro, setConfirmacionCentro] = useState("");
  const [restaurandoCentro, setRestaurandoCentro] = useState(false);
  const [loginPasswordHabilitado, setLoginPasswordHabilitado] = useState(loginPasswordHabilitadoInicial);
  const [cambiandoInterruptor, setCambiandoInterruptor] = useState(false);
  const [historiasEntreCentros, setHistoriasEntreCentros] = useState(historiasEntreCentrosHabilitadoInicial);
  const [cambiandoInterruptorHistorias, setCambiandoInterruptorHistorias] = useState(false);

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

  async function handleToggleHistoriasEntreCentros() {
    const nuevoValor = !historiasEntreCentros;
    setCambiandoInterruptorHistorias(true);
    setError(null);
    try {
      await actualizarHistoriasEntreCentrosHabilitado(nuevoValor);
      setHistoriasEntreCentros(nuevoValor);
      setExito(nuevoValor ? "Las historias ya se vuelven a ver entre todos los centros." : "Cada centro ya solo ve sus propias historias.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el ajuste.");
    } finally {
      setCambiandoInterruptorHistorias(false);
    }
  }

  const [elegida, setElegida] = useState<Copia | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [restaurando, setRestaurando] = useState(false);

  async function cargar() {
    if (!centroElegido) {
      setCopias([]);
      return;
    }
    setCargando(true);
    const data = await listarCopiasSeguridad(centroElegido);
    setCopias(data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, [centroElegido]);

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
    if (!centroElegido) {
      setError("Elige un centro.");
      return;
    }
    setCreando(true);
    setError(null);
    setExito(null);
    try {
      await crearCopiaSeguridad(centroElegido);
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
    if (!elegida || !centroElegido) return;
    setRestaurando(true);
    setError(null);
    try {
      await restaurarDesdeArchivo(centroElegido, elegida.id);
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

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-sm font-bold text-[#0B1D4D]">Historias entre centros</h3>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Con esto activado (lo normal), las historias que sube cualquier centro las pueden ver todos los demás centros entre sí, como hasta ahora. Desactívalo si quieres que cada centro solo vea las suyas propias.
          </p>
        </div>
        <button
          onClick={handleToggleHistoriasEntreCentros}
          disabled={cambiandoInterruptorHistorias}
          className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            historiasEntreCentros ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              historiasEntreCentros ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Centro para el que quieres hacer copias manualmente</label>
        <select
          value={centroElegido}
          onChange={(e) => setCentroElegido(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
        >
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <DatabaseBackup className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">Backup BBDD instantáneo</h3>
          <p className="mt-1 text-xs text-slate-500">
            Copia solo de los datos de este centro (alumnos, profesorado, guardias, prácticas, empresas, todo lo suyo). Se guarda en dos carpetas separadas en Drive: &quot;Backup BBDD JSON&quot; (el que sabe usar el botón Restaurar de aquí abajo) y &quot;Backup BBDD SQL&quot; (para ejecutarlo tú mismo en Supabase). Los manuales llevan &quot;manual&quot; en el nombre; los de cada noche, &quot;automatico&quot;. No incluye datos de otros centros.
          </p>
          <div className="mt-auto pt-3">
            <button
              onClick={handleCrearBBDD}
              disabled={creandoBBDD || !centroElegido}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creandoBBDD ? <ButtonSpinner /> : <DatabaseBackup className="h-4 w-4" />}
              {creandoBBDD ? "Generando..." : "Copiar BBDD ahora"}
            </button>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
            <DatabaseBackup className="h-5 w-5 text-[#FD5249]" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">{translate(locale, "backup.crearTitulo")}</h3>
          <p className="mt-1 text-xs text-slate-500">{translate(locale, "backup.crearAyuda")}</p>
          <button
            onClick={handleCrear}
            disabled={creando || !centroElegido}
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
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#0B1D4D]">
          <Clock className="h-4 w-4 text-[#FD5249]" /> {translate(locale, "backup.copiasDisponibles")}
        </h3>

        <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-xs" style={{ width: "fit-content" }}>
          <button
            onClick={() => setPestanaBackup("instantaneo")}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${pestanaBackup === "instantaneo" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
          >
            Backup BBDD instantáneo
          </button>
          <button
            onClick={() => setPestanaBackup("manual")}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${pestanaBackup === "manual" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
          >
            Copia manual
          </button>
          <button
            onClick={() => setPestanaBackup("excel")}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${pestanaBackup === "excel" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}
          >
            Excel por módulos
          </button>
          <button
            onClick={() => setPestanaBackup("restaurarWeb")}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${pestanaBackup === "restaurarWeb" ? "bg-white text-amber-600 shadow-sm" : "text-slate-500"}`}
          >
            Restaurar la web
          </button>
          <button
            onClick={() => setPestanaBackup("destinos")}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${pestanaBackup === "destinos" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
          >
            Destinos por centro
          </button>
        </div>

        {pestanaBackup === "instantaneo" && (
          <div>
            <select
              value={centroElegido}
              onChange={(e) => setCentroElegido(e.target.value)}
              className="mb-3 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#FD5249]"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {!centroElegido ? (
              <p className="rounded-lg bg-slate-50 px-3 py-8 text-center text-xs text-slate-400">Elige un centro para ver sus copias.</p>
            ) : cargandoBackupsCentro ? (
              <p className="py-8 text-center text-xs text-slate-400">Cargando...</p>
            ) : backupsCentro.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-8 text-center text-xs text-slate-400">Todavía no hay ninguna copia de este centro.</p>
            ) : (
              <div className="space-y-2">
                {backupsCentro.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <DatabaseBackup className="h-4 w-4 shrink-0 text-blue-500" />
                      <span className="text-sm font-semibold text-slate-700">{formatFecha(c.fecha)}</span>
                    </div>
                    <button
                      onClick={() => {
                        setElegidaCentro(c);
                        setConfirmacionCentro("");
                        setError(null);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600"
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {pestanaBackup === "excel" && (
          <p className="rounded-lg bg-slate-50 px-3 py-8 text-center text-xs text-slate-400">
            Estas copias se guardan directamente en Google Drive (una carpeta por centro y por módulo), no se restauran desde aquí — consúltalas directamente en Drive.
          </p>
        )}

        {(pestanaBackup === "manual" || pestanaBackup === "restaurarWeb") && (
          <>
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
        </>
        )}

        {pestanaBackup === "destinos" && <DestinosBackupPanel centroElegido={centroElegido} />}
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

// Dónde va la copia de seguridad de un centro concreto — configurable
// por centro. Las credenciales de conexión (OAuth de Google, la app de
// Azure para OneDrive) son globales de la plataforma y se configuran
// aparte, en el .env del servidor; aquí solo se dice A QUÉ carpeta/
// correo, dentro de esas cuentas ya conectadas.
function DestinosBackupPanel({
  centroElegido,
}: {
  centroElegido: string;
}) {
  const { locale } = useLocale();
  const [driveBackupFolderId, setDriveBackupFolderId] = useState("");
  const [oneDriveBackupEmail, setOneDriveBackupEmail] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centroElegido) return;
    setCargando(true);
    setGuardado(false);
    obtenerDestinosBackupCentro(centroElegido)
      .then((d) => {
        setDriveBackupFolderId(d.driveBackupFolderId);
        setOneDriveBackupEmail(d.oneDriveBackupEmail);
      })
      .finally(() => setCargando(false));
  }, [centroElegido]);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    setGuardado(false);
    const formData = new FormData();
    formData.set("driveBackupFolderId", driveBackupFolderId);
    formData.set("oneDriveBackupEmail", oneDriveBackupEmail);
    try {
      await guardarDestinosBackupCentro(centroElegido, formData);
      setGuardado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      {cargando ? (
        <p className="py-8 text-center text-xs text-slate-400">{translate(locale, "backup.cargando")}</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Si dejas alguno de los dos vacío, ese centro sigue usando el destino general de la plataforma (Google Drive) o, en el caso de OneDrive, simplemente no se sube nada ahí para este centro.
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Carpeta de Google Drive</label>
            <input
              value={driveBackupFolderId}
              onChange={(e) => setDriveBackupFolderId(e.target.value)}
              placeholder="Id de la carpeta de Drive (déjalo vacío para usar la general)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Va dentro de la misma cuenta de Google ya conectada a la plataforma — copia el id de la carpeta desde su URL en Drive.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Correo de OneDrive</label>
            <input
              type="email"
              value={oneDriveBackupEmail}
              onChange={(e) => setOneDriveBackupEmail(e.target.value)}
              placeholder="correo@tucentro.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              El correo de Microsoft 365 del centro en cuyo OneDrive se guarda esta copia.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {guardando ? <ButtonSpinner /> : "Guardar"}
            </button>
            {guardado && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Guardado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
