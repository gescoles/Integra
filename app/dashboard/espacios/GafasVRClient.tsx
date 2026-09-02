"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2, Glasses, UserCog, Filter } from "lucide-react";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { SelectorHoras } from "./SelectorHoras";
import {
  crearReservaGafasVR,
  eliminarReservaGafasVR,
  marcarGafasDevueltas,
  desmarcarGafasDevueltas,
  asignarTicCentro,
} from "./gafasVR";

type Reserva = {
  id: string;
  userNombre: string;
  userId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: "RESERVADA" | "DEVUELTA";
  devueltoEn: string | null;
};
type Profesor = { id: string; nombre: string; role: string };

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]";

export function GafasVRClient({
  schoolId,
  reservas,
  currentUserId,
  esDirectivo,
  esTic,
  isSuperAdmin,
  ticActual,
  profesoresParaTic,
}: {
  schoolId: string;
  reservas: Reserva[];
  currentUserId: string;
  esDirectivo: boolean;
  esTic: boolean;
  isSuperAdmin: boolean;
  ticActual: { id: string; nombre: string } | null;
  profesoresParaTic: Profesor[];
}) {
  const router = useRouter();
  const puedeVerTodas = esDirectivo || esTic;
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [ticSeleccionado, setTicSeleccionado] = useState(ticActual?.id ?? "");
  const [guardandoTic, setGuardandoTic] = useState(false);
  const [filtroUserId, setFiltroUserId] = useState("TODOS");

  const hoyISO = new Date().toISOString().slice(0, 10);
  const reservasDelDia = useMemo(() => {
    const deHoy = reservas.filter((r) => r.fecha.slice(0, 10) === fecha && r.estado === "RESERVADA");
    // Si la fecha elegida es hoy, las horas ya pasadas se bloquean igual
    // que una reserva más — así solo quedan seleccionables las horas que
    // faltan del día (o el día entero, si se elige uno futuro).
    if (fecha === hoyISO) {
      const ahora = new Date();
      const horaActual = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
      return [...deHoy, { horaInicio: "00:00", horaFin: horaActual }];
    }
    return deHoy;
  }, [reservas, fecha, hoyISO]);

  const profesoresConReserva = useMemo(() => {
    const mapa = new Map<string, string>();
    reservas.forEach((r) => mapa.set(r.userId, r.userNombre));
    return Array.from(mapa, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [reservas]);

  const listaVisible = puedeVerTodas
    ? filtroUserId === "TODOS"
      ? reservas
      : reservas.filter((r) => r.userId === filtroUserId)
    : reservas.filter((r) => r.userId === currentUserId);

  async function handleReservar(e: React.FormEvent) {
    e.preventDefault();
    if (!horaInicio || !horaFin) {
      setError("Elige la hora de inicio y de fin.");
      return;
    }
    setPending(true);
    setError(null);
    setExito(null);
    const formData = new FormData();
    formData.set("fecha", fecha);
    formData.set("horaInicio", horaInicio);
    formData.set("horaFin", horaFin);
    try {
      await crearReservaGafasVR(formData);
      setExito("Reserva hecha. Te ha llegado la confirmación por correo.");
      setHoraInicio("");
      setHoraFin("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reservar.");
    } finally {
      setPending(false);
    }
  }

  async function handleCancelar(id: string) {
    if (!confirm("¿Cancelar esta reserva de las gafas?")) return;
    try {
      await eliminarReservaGafasVR(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar.");
    }
  }

  async function handleDevuelto(id: string) {
    try {
      await marcarGafasDevueltas(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo marcar como devuelta.");
    }
  }

  async function handleDesmarcar(id: string) {
    try {
      await desmarcarGafasDevueltas(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo deshacer.");
    }
  }

  async function handleGuardarTic() {
    setGuardandoTic(true);
    setError(null);
    try {
      await asignarTicCentro(schoolId, ticSeleccionado || null);
      setExito("TIC del centro actualizado.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el TIC.");
    } finally {
      setGuardandoTic(false);
    }
  }

  return (
    <div>
      {isSuperAdmin && (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-[#0B1D4D]">TIC del centro</h3>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            El TIC recibe un correo cada vez que alguien reserva las gafas, y es quien las marca como devueltas.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={ticSeleccionado} onChange={(e) => setTicSeleccionado(e.target.value)} className={`${inputClass} max-w-xs`}>
              <option value="">Sin TIC asignado</option>
              {profesoresParaTic.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.role === "COORDINADOR" || p.role === "ADMIN_CENTRO" || p.role === "ADMINISTRACION" ? "Equipo directivo" : "Profesor/a"})
                </option>
              ))}
            </select>
            <button
              onClick={handleGuardarTic}
              disabled={guardandoTic}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {guardandoTic ? <ButtonSpinner /> : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
      {exito && <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{exito}</div>}

      <form onSubmit={handleReservar} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 max-w-xs">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Fecha</label>
          <input
            type="date"
            value={fecha}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setFecha(e.target.value);
              setHoraInicio("");
              setHoraFin("");
            }}
            className={inputClass}
          />
        </div>

        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Hora</label>
        <SelectorHoras
          horaInicio={horaInicio}
          horaFin={horaFin}
          reservasDelDia={reservasDelDia}
          onChange={(inicio, fin) => {
            setHoraInicio(inicio);
            setHoraFin(fin);
          }}
        />

        <button
          type="submit"
          disabled={pending}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60 sm:w-auto"
        >
          {pending ? <ButtonSpinner /> : <Plus className="h-4 w-4" />} Reservar gafas
        </button>
      </form>

      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#0B1D4D]">
        <Glasses className="h-4 w-4 text-[#FD5249]" /> {puedeVerTodas ? "Todas las reservas" : "Mis reservas"}
      </h3>
      {puedeVerTodas && profesoresConReserva.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <label className="text-xs font-semibold text-slate-500">Filtrar por profesor:</label>
          <select
            value={filtroUserId}
            onChange={(e) => setFiltroUserId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#FD5249]"
          >
            <option value="TODOS">Todos los profesores</option>
            {profesoresConReserva.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {listaVisible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Todavía no hay ninguna reserva de las gafas.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {listaVisible.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(`${r.fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                    {" · "}
                    {r.horaInicio} – {r.horaFin}
                  </p>
                  <p className="text-xs text-slate-400">
                    {puedeVerTodas && <>{r.userNombre} · </>}
                    {r.estado === "DEVUELTA" ? (
                      <span className="font-semibold text-emerald-600">Devueltas{r.devueltoEn ? ` el ${new Date(r.devueltoEn).toLocaleDateString("es-ES")}` : ""}</span>
                    ) : (
                      <span className="font-semibold text-amber-600">Reservadas</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {esTic && r.estado === "RESERVADA" && (
                    <button
                      onClick={() => handleDevuelto(r.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Devuelto
                    </button>
                  )}
                  {esTic && r.estado === "DEVUELTA" && (
                    <button
                      onClick={() => handleDesmarcar(r.id)}
                      title="Volver a marcar como pendiente de devolver"
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Devuelto
                    </button>
                  )}
                  {(r.userId === currentUserId || esDirectivo) && r.estado === "RESERVADA" && (
                    <button onClick={() => handleCancelar(r.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
