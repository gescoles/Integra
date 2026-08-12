"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Search } from "lucide-react";
import { obtenerMisCoberturas, obtenerMisSolicitudesPendientes, obtenerProfesoresDelCentro } from "./actions";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type EstadoItem = "PENDIENTE" | "ASIGNADA" | "RECHAZADA";

type Item = {
  id: string;
  otroNombre?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  asignatura: string | null;
  grupo: string | null;
  ubicacion?: string | null;
  estado: EstadoItem;
};
type Profesor = { id: string; nombre: string };

function formatFecha(fechaISO: string) {
  return new Date(`${fechaISO.slice(0, 10)}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "long" });
}

function InsigniaEstado({ estado }: { estado: EstadoItem }) {
  const { locale } = useLocale();
  const estilos: Record<EstadoItem, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700",
    ASIGNADA: "bg-emerald-100 text-emerald-700",
    RECHAZADA: "bg-red-100 text-red-700",
  };
  const etiquetas: Record<EstadoItem, string> = {
    PENDIENTE: translate(locale, "guardias.pendiente"),
    ASIGNADA: translate(locale, "guardias.confirmada"),
    RECHAZADA: translate(locale, "guardias.rechazada"),
  };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${estilos[estado]}`}>{etiquetas[estado]}</span>
  );
}

function FilaCobertura({ item, otroLabel }: { item: Item; otroLabel: string }) {
  const { locale } = useLocale();
  const fondos: Record<EstadoItem, string> = {
    PENDIENTE: "border-amber-200 bg-amber-50/50",
    ASIGNADA: "border-slate-100",
    RECHAZADA: "border-red-200 bg-red-50/50",
  };
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${fondos[item.estado]}`}>
      <div>
        <p className="text-sm font-semibold text-slate-700">
          {item.estado !== "ASIGNADA" ? (
            <span className="text-slate-500">{translate(locale, "guardias.tuAusencia")}</span>
          ) : (
            <>
              {otroLabel}: <span className="font-bold text-[#0B1D4D]">{item.otroNombre}</span>
            </>
          )}
        </p>
        <p className="text-xs text-slate-400">
          {formatFecha(item.fecha)} · {item.horaInicio}–{item.horaFin}
          {item.grupo ? ` · ${item.grupo}` : ""}
          {item.ubicacion ? ` · ${item.ubicacion}` : ""}
        </p>
      </div>
      <InsigniaEstado estado={item.estado} />
    </div>
  );
}

// Para profesor: su propio historial, con sus solicitudes pendientes
// integradas. Para dirección/SuperAdmin: un buscador para consultar el
// historial de cualquier profesor del centro.
export function MisCoberturas({
  modo,
  schoolId,
}: {
  modo: "propio" | "buscador";
  schoolId?: string;
}) {
  const { locale } = useLocale();
  const [tab, setTab] = useState<"cubiertas" | "recibidas">("cubiertas");
  const [cubiertas, setCubiertas] = useState<Item[]>([]);
  const [recibidas, setRecibidas] = useState<Item[]>([]);
  const [pendientes, setPendientes] = useState<Item[]>([]);
  const [cargado, setCargado] = useState(modo === "propio" ? false : true);

  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [profesorElegido, setProfesorElegido] = useState<Profesor | null>(null);

  useEffect(() => {
    if (modo === "buscador") {
      obtenerProfesoresDelCentro(schoolId).then(setProfesores);
    }
  }, [modo, schoolId]);

  useEffect(() => {
    if (modo === "propio") {
      Promise.all([obtenerMisCoberturas(), obtenerMisSolicitudesPendientes()]).then(
        ([{ cubiertas, recibidas: recibidasAsignadas }, pendientesRaw]) => {
          // Los dos orígenes tienen formas distintas (las coberturas ya
          // asignadas traen otroNombre/ubicacion; las solicitudes pendientes
          // todavía no, porque aún no hay sustituto), así que se normalizan
          // ambas al tipo Item del componente antes de combinarlas.
          const pendientesComoItem: Item[] = pendientesRaw.map((p) => ({
            id: p.id,
            fecha: p.fecha,
            horaInicio: p.horaInicio,
            horaFin: p.horaFin,
            asignatura: p.asignatura,
            grupo: p.grupo,
            estado: p.estado,
          }));
          const recibidasCombinadas: Item[] = [...recibidasAsignadas, ...pendientesComoItem];

          setCubiertas(cubiertas);
          setRecibidas(recibidasCombinadas);
          setPendientes(pendientesComoItem.filter((p) => p.estado === "PENDIENTE"));
          setCargado(true);
          if (pendientesComoItem.length > 0) setTab("recibidas");
        }
      );
    }
  }, [modo]);

  useEffect(() => {
    if (modo === "buscador" && profesorElegido) {
      setCargado(false);
      obtenerMisCoberturas(profesorElegido.id).then(({ cubiertas, recibidas }) => {
        setCubiertas(cubiertas);
        setRecibidas(recibidas);
        setCargado(true);
      });
    }
  }, [modo, profesorElegido]);

  const profesoresFiltrados = profesores.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const lista = tab === "cubiertas" ? cubiertas : recibidas;

  return (
    <div className="mb-8">
      {modo === "buscador" && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#0B1D4D]">
            <Search className="h-4 w-4 text-[#FD5249]" /> {translate(locale, "guardias.buscarProfesor")}
          </h3>
          <input
            value={profesorElegido ? profesorElegido.nombre : busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setProfesorElegido(null);
            }}
            placeholder={translate(locale, "guardias.buscarProfesorPlaceholder")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
          />
          {busqueda && !profesorElegido && (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {profesoresFiltrados.length === 0 ? (
                <p className="px-2 py-2 text-xs text-slate-400">{translate(locale, "guardias.sinResultados")}</p>
              ) : (
                profesoresFiltrados.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfesorElegido(p);
                      setBusqueda("");
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {p.nombre}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {(modo === "propio" || profesorElegido) && cargado && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-[#0B1D4D]">
            {translate(locale, "guardias.historialCoberturas")}
            {profesorElegido && <span className="font-normal text-slate-400"> · {profesorElegido.nombre}</span>}
          </h3>
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setTab("cubiertas")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                tab === "cubiertas" ? "bg-[#FD5249] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" /> {translate(locale, "guardias.queHeCubierto")} ({cubiertas.length})
            </button>
            <button
              onClick={() => setTab("recibidas")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                tab === "recibidas" ? "bg-[#FD5249] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" /> {translate(locale, "guardias.queMeHanCubierto")} ({recibidas.length})
              {pendientes.length > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendientes.length}
                </span>
              )}
            </button>
          </div>

          {lista.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
              {translate(locale, "guardias.sinCoberturas")}
            </p>
          ) : (
            <div className="space-y-2">
              {lista.map((item) => (
                <FilaCobertura
                  key={item.id}
                  item={item}
                  otroLabel={tab === "cubiertas" ? translate(locale, "guardias.cubristeA") : translate(locale, "guardias.teCubrio")}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
