"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Clock, Trash2, Filter } from "lucide-react";
import { Plano3D } from "./Plano3D";
import { ReservaPanel } from "./ReservaPanel";
import { NuevaPlantaModal, EliminarPlantaButton, NuevaAulaModal, EliminarAulaButton } from "./AdminPlano";
import { eliminarReserva } from "./actions";
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
type Aula = {
  id: string;
  nombre: string;
  x: number;
  z: number;
  ancho: number;
  profundo: number;
  alto: number;
  color: string;
  reservas: Reserva[];
};
type Planta = {
  id: string;
  numero: number;
  nombre: string;
  aulas: Aula[];
};
type Usuario = { id: string; name: string };

export function EspaciosClient({
  plantas,
  currentUserId,
  esDirectivo,
  isSuperAdmin,
  usuarios,
  schoolId,
}: {
  plantas: Planta[];
  currentUserId: string;
  esDirectivo: boolean;
  isSuperAdmin: boolean;
  usuarios: Usuario[];
  schoolId: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [vista, setVista] = useState<"inicio" | "nueva">("inicio");
  const plantasOrdenadas = useMemo(() => [...plantas].sort((a, b) => b.numero - a.numero), [plantas]);
  const [plantaActivaId, setPlantaActivaId] = useState<string | null>(plantasOrdenadas[0]?.id ?? null);
  const [aulaSeleccionadaId, setAulaSeleccionadaId] = useState<string | null>(null);

  const plantaActiva = plantasOrdenadas.find((p) => p.id === plantaActivaId) ?? plantasOrdenadas[0] ?? null;

  const hoy = new Date().toISOString().slice(0, 10);
  const aulas3D = useMemo(
    () =>
      (plantaActiva?.aulas ?? []).map((a) => ({
        id: a.id,
        nombre: a.nombre,
        x: a.x,
        z: a.z,
        ancho: a.ancho,
        profundo: a.profundo,
        alto: a.alto,
        color: a.color,
        tieneReservaHoy: a.reservas.some((r) => r.fecha.slice(0, 10) === hoy),
      })),
    [plantaActiva, hoy]
  );

  const aulaSeleccionada = plantaActiva?.aulas.find((a) => a.id === aulaSeleccionadaId) ?? null;

  const misReservas = useMemo(() => {
    const todas = plantas.flatMap((p) =>
      p.aulas.flatMap((a) =>
        a.reservas
          .filter((r) => esDirectivo || r.userId === currentUserId)
          .map((r) => ({ ...r, aulaNombre: a.nombre }))
      )
    );
    return todas.sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));
  }, [plantas, currentUserId, esDirectivo]);

  // Solo para el equipo directivo/SuperAdmin: poder filtrar la lista de
  // reservas del centro por un profesor en concreto, sin mezclarlo con las
  // reservas del propio directivo.
  const [filtroUserId, setFiltroUserId] = useState("TODOS");
  const reservasFiltradas = useMemo(
    () => (esDirectivo && filtroUserId !== "TODOS" ? misReservas.filter((r) => r.userId === filtroUserId) : misReservas),
    [misReservas, esDirectivo, filtroUserId]
  );
  const profesoresConReserva = useMemo(() => {
    const mapa = new Map<string, string>();
    misReservas.forEach((r) => mapa.set(r.userId, r.userNombre));
    return Array.from(mapa, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [misReservas]);

  function handleNuevaReserva() {
    setAulaSeleccionadaId(null);
    setVista("nueva");
  }

  function handleReservaCreada() {
    setAulaSeleccionadaId(null);
    setVista("inicio");
  }

  function handleEliminarDesdeInicio(id: string) {
    if (!confirm(translate(locale, "espacios.confirmEliminarReserva"))) return;
    eliminarReserva(id).then(() => router.refresh());
  }

  if (plantasOrdenadas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
        {translate(locale, "espacios.sinPlantas")}
      </div>
    );
  }

  // ------------------- Pantalla inicial: Mis reservas -------------------
  if (vista === "inicio") {
    return (
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#0B1D4D]">
            {esDirectivo ? translate(locale, "espacios.reservasDelCentro") : translate(locale, "espacios.misReservas")}
          </h2>
          <button
            onClick={handleNuevaReserva}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            <Plus className="h-4 w-4" /> {translate(locale, "espacios.nuevaReserva")}
          </button>
        </div>

        {esDirectivo && misReservas.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <label className="text-xs font-semibold text-slate-500">{translate(locale, "espacios.filtrarPorProfesor")}</label>
            <select
              value={filtroUserId}
              onChange={(e) => setFiltroUserId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#FD5249]"
            >
              <option value="TODOS">{translate(locale, "espacios.todosLosProfesores")}</option>
              {profesoresConReserva.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        {reservasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-sm text-slate-400">
            {misReservas.length === 0
              ? esDirectivo
                ? translate(locale, "espacios.sinReservasCentro")
                : translate(locale, "espacios.sinReservasPropias")
              : translate(locale, "espacios.sinReservasFiltro")}
          </div>
        ) : (
          <div className="space-y-2">
            {reservasFiltradas.map((r) => (
              <div key={r.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-700">{r.aulaNombre}</span>
                    {esDirectivo && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{r.userNombre}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {new Date(`${r.fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                    {" · "}
                    {r.horaInicio} – {r.horaFin}
                  </div>
                </div>
                <button
                  onClick={() => handleEliminarDesdeInicio(r.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ------------------- Pantalla de nueva reserva: plano 3D -------------------
  return (
    <div>
      <button
        onClick={() => setVista("inicio")}
        className="mb-4 text-xs font-semibold text-slate-400 hover:text-[#FD5249]"
      >
        ← {esDirectivo ? translate(locale, "espacios.reservasDelCentro") : translate(locale, "espacios.misReservas")}
      </button>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {plantasOrdenadas.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <button
                onClick={() => {
                  setPlantaActivaId(p.id);
                  setAulaSeleccionadaId(null);
                }}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
                  plantaActiva?.id === p.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {p.nombre}
              </button>
              {isSuperAdmin && <EliminarPlantaButton plantaId={p.id} />}
            </div>
          ))}
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <NuevaPlantaModal schoolId={schoolId} />
            {plantaActiva && <NuevaAulaModal plantaId={plantaActiva.id} />}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <Plano3D aulas={aulas3D} onSelectAula={setAulaSeleccionadaId} aulaSeleccionadaId={aulaSeleccionadaId} />
          <p className="mt-2 text-center text-xs text-slate-400">{translate(locale, "espacios.ayudaGirar")}</p>

          {isSuperAdmin && plantaActiva && plantaActiva.aulas.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{translate(locale, "espacios.aulasDeEstaPlanta")}</p>
              <div className="flex flex-wrap gap-2">
                {plantaActiva.aulas.map((a) => (
                  <div key={a.id} className="flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
                    {a.nombre}
                    <EliminarAulaButton aulaId={a.id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {aulaSeleccionada ? (
            <ReservaPanel
              aulaId={aulaSeleccionada.id}
              aulaNombre={aulaSeleccionada.nombre}
              reservas={aulaSeleccionada.reservas}
              currentUserId={currentUserId}
              esDirectivo={esDirectivo}
              usuarios={usuarios}
              onClose={() => setAulaSeleccionadaId(null)}
              onReservaCreada={handleReservaCreada}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
              {translate(locale, "espacios.eligeAula")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
