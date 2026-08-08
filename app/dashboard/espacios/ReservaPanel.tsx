"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, X, Trash2, UserCog } from "lucide-react";
import { crearReserva, eliminarReserva } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Reserva = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  userNombre: string;
  userId: string;
};
type Usuario = { id: string; name: string };

const HORA_APERTURA = "08:00";
const HORA_CIERRE = "18:30";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
function limiteISO() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function ReservaPanel({
  aulaId,
  aulaNombre,
  reservas,
  currentUserId,
  esDirectivo,
  usuarios,
  onClose,
  onReservaCreada,
}: {
  aulaId: string;
  aulaNombre: string;
  reservas: Reserva[];
  currentUserId: string;
  esDirectivo: boolean;
  usuarios: Usuario[];
  onClose: () => void;
  onReservaCreada: () => void;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [fecha, setFecha] = useState(hoyISO());
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [userIdReserva, setUserIdReserva] = useState(currentUserId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reservasDelDia = useMemo(
    () => reservas.filter((r) => r.fecha.slice(0, 10) === fecha).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    [reservas, fecha]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData();
    formData.set("aulaId", aulaId);
    formData.set("fecha", fecha);
    formData.set("horaInicio", horaInicio);
    formData.set("horaFin", horaFin);
    if (esDirectivo) formData.set("userId", userIdReserva);
    try {
      await crearReserva(formData);
      router.refresh();
      onReservaCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reservar.");
      setPending(false);
    }
  }

  function handleEliminar(id: string) {
    if (!confirm(translate(locale, "espacios.confirmEliminarReserva"))) return;
    eliminarReserva(id)
      .then(() => router.refresh())
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo eliminar."));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0B1D4D]">{aulaNombre}</h3>
          <p className="text-xs text-slate-400">
            {translate(locale, "espacios.horarioCentro")}: {HORA_APERTURA} – {HORA_CIERRE}
          </p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="mb-5 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.fecha")}</label>
          <input
            type="date"
            value={fecha}
            min={hoyISO()}
            max={limiteISO()}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
          />
          <p className="mt-1 text-[11px] text-slate-400">{translate(locale, "espacios.avisoAntelacion")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.desde")}</label>
            <input
              type="time"
              value={horaInicio}
              min={HORA_APERTURA}
              max={HORA_CIERRE}
              step={900}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.hasta")}</label>
            <input
              type="time"
              value={horaFin}
              min={HORA_APERTURA}
              max={HORA_CIERRE}
              step={900}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400">{translate(locale, "espacios.avisoMaxHoras")}</p>

        {esDirectivo && (
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
              <UserCog className="h-3 w-3" /> {translate(locale, "espacios.reservarParaOtro")}
            </label>
            <select
              value={userIdReserva}
              onChange={(e) => setUserIdReserva(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
            >
              <option value={currentUserId}>{translate(locale, "espacios.paraMi")}</option>
              {usuarios
                .filter((u) => u.id !== currentUserId)
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
        >
          {pending && <ButtonSpinner />}
          {translate(locale, "espacios.reservar")}
        </button>
      </form>

      <div className="border-t border-slate-100 pt-4">
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
          <Clock className="h-3.5 w-3.5" /> {translate(locale, "espacios.reservasDelDia")}
        </h4>
        {reservasDelDia.length === 0 ? (
          <p className="text-xs text-slate-400">{translate(locale, "espacios.sinReservasDia")}</p>
        ) : (
          <div className="space-y-1.5">
            {reservasDelDia.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">{r.horaInicio} – {r.horaFin}</span>
                  <span className="ml-2 text-slate-500">{r.userNombre}</span>
                </div>
                {(esDirectivo || r.userId === currentUserId) && (
                  <button onClick={() => handleEliminar(r.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
