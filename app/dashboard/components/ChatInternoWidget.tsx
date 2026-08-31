"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Circle, Check, CheckCheck, Plus, Search, ArrowLeft } from "lucide-react";
import {
  obtenerUsuariosParaChat,
  obtenerConversacion,
  enviarMensajeChat,
  marcarConversacionLeida,
  cambiarMiEstadoPresencia,
  obtenerResumenChat,
  buscarUsuariosSinChat,
} from "../chatActions";
import { useChatInterno } from "../SchoolContext";

type UsuarioChat = {
  id: string;
  nombre: string;
  avatarUrl: string | null;
  role: string;
  estadoPresencia: "DISPONIBLE" | "AUSENTE" | "DESCONECTADO";
  ultimoMensaje: string | null;
  ultimoMensajeFecha: string | null;
  noLeidos: number;
};

type Mensaje = { id: string; texto: string; esMio: boolean; createdAt: string; leido: boolean };

const ESTADO_COLOR: Record<string, string> = {
  DISPONIBLE: "bg-emerald-500",
  AUSENTE: "bg-amber-500",
  DESCONECTADO: "bg-slate-300",
};
const ESTADO_LABEL: Record<string, string> = {
  DISPONIBLE: "Disponible",
  AUSENTE: "Ausente",
  DESCONECTADO: "Desconectado",
};

function tiempoRelativo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function ChatInternoWidget() {
  const { abierto: open, cerrar, abrirConversacionId, setTotalNoLeidos: setTotalNoLeidosContexto } = useChatInterno();
  const [usuarios, setUsuarios] = useState<UsuarioChat[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [buscandoNuevo, setBuscandoNuevo] = useState(false);
  const [busquedaNuevo, setBusquedaNuevo] = useState("");
  const [resultadosNuevo, setResultadosNuevo] = useState<{ id: string; nombre: string; avatarUrl: string | null; estadoPresencia: "DISPONIBLE" | "AUSENTE" | "DESCONECTADO" }[]>([]);
  const [conversacionCon, setConversacionCon] = useState<UsuarioChat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [miEstado, setMiEstado] = useState<"DISPONIBLE" | "AUSENTE" | "DESCONECTADO">("DESCONECTADO");
  const [selectorEstadoAbierto, setSelectorEstadoAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Al entrar en la app, nos ponemos "Disponible" solos, salvo que el
  // usuario ya hubiera elegido otra cosa a mano en una sesión anterior —
  // eso lo respetamos leyendo el estado real que ya tuviera guardado.
  useEffect(() => {
    obtenerResumenChat().then((r) => {
      setMiEstado(r.miEstado);
      setTotalNoLeidosContexto(r.totalNoLeidos);
      if (r.miEstado === "DESCONECTADO") {
        cambiarMiEstadoPresencia("DISPONIBLE").then(() => setMiEstado("DISPONIBLE"));
      }
    });

    function alSalir() {
      // navigator.sendBeacon no puede llamar directamente a una server
      // action, así que aquí solo dejamos el estado tal cual — el mensaje
      // "desconectado" real se pondría al cerrar sesión de verdad.
    }
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, []);

  // Sondeo mientras el panel está realmente ABIERTO: refresca la lista de
  // usuarios y los mensajes de la conversación activa. El total de no
  // leídos ya lo mantiene al día el contexto compartido (una sola vez
  // para toda la app, no hace falta repetirlo aquí).
  useEffect(() => {
    if (!open) return;
    const id = setInterval(async () => {
      const lista = await obtenerUsuariosParaChat();
      setUsuarios(lista);
      if (conversacionCon) {
        const msgs = await obtenerConversacion(conversacionCon.id);
        setMensajes(msgs);
      }
    }, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversacionCon?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

  // Al abrirse desde la barra superior, cargamos la lista de usuarios —
  // y si se pidió abrir directamente una conversación concreta, la abrimos.
  useEffect(() => {
    if (!open) return;
    obtenerUsuariosParaChat().then((lista) => {
      setUsuarios(lista);
      if (abrirConversacionId) {
        const u = lista.find((x) => x.id === abrirConversacionId);
        if (u) abrirConversacion(u);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Búsqueda de gente nueva con quien empezar a hablar, con una pequeña
  // pausa mientras se escribe.
  useEffect(() => {
    if (!buscandoNuevo || busquedaNuevo.trim().length < 1) {
      setResultadosNuevo([]);
      return;
    }
    const id = setTimeout(() => {
      buscarUsuariosSinChat(busquedaNuevo).then(setResultadosNuevo);
    }, 300);
    return () => clearTimeout(id);
  }, [busquedaNuevo, buscandoNuevo]);

  function empezarConversacionNueva(u: { id: string; nombre: string; avatarUrl: string | null; estadoPresencia: "DISPONIBLE" | "AUSENTE" | "DESCONECTADO" }) {
    setBuscandoNuevo(false);
    setBusquedaNuevo("");
    setResultadosNuevo([]);
    abrirConversacion({ ...u, role: "PROFESOR", ultimoMensaje: null, ultimoMensajeFecha: null, noLeidos: 0 });
  }

  async function abrirConversacion(u: UsuarioChat) {
    setConversacionCon(u);
    const msgs = await obtenerConversacion(u.id);
    setMensajes(msgs);
    if (u.noLeidos > 0) {
      await marcarConversacionLeida(u.id);
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, noLeidos: 0 } : x)));
      const resumen = await obtenerResumenChat();
      setTotalNoLeidosContexto(resumen.totalNoLeidos);
    }
  }

  async function handleEnviar() {
    if (!conversacionCon || !texto.trim() || enviando) return;
    const contenido = texto.trim();
    setTexto("");
    setEnviando(true);
    // Optimista: lo pintamos ya, antes de que responda el servidor.
    setMensajes((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, texto: contenido, esMio: true, createdAt: new Date().toISOString(), leido: false },
    ]);
    try {
      await enviarMensajeChat(conversacionCon.id, contenido);
      const msgs = await obtenerConversacion(conversacionCon.id);
      setMensajes(msgs);
    } finally {
      setEnviando(false);
    }
  }

  async function handleCambiarEstado(estado: "DISPONIBLE" | "AUSENTE" | "DESCONECTADO") {
    setMiEstado(estado);
    setSelectorEstadoAbierto(false);
    await cambiarMiEstadoPresencia(estado);
  }

  const filtrados = usuarios.filter((u) => u.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 sm:p-6" onClick={cerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full overflow-hidden rounded-none border-0 bg-white shadow-2xl sm:h-[75vh] sm:max-h-[720px] sm:w-[85vw] sm:max-w-[1000px] sm:rounded-2xl sm:border sm:border-slate-200"
      >
      {/* Columna izquierda: siempre visible, con la lista de gente con
          quien chatear — como en Discord, no hace falta "volver atrás"
          para cambiar de conversación. */}
      <div className={`w-full shrink-0 flex-col border-r border-slate-100 bg-slate-50 sm:flex sm:w-60 ${conversacionCon ? "hidden" : "flex"}`}>
        <div className="border-b border-slate-100 bg-[#0B1D4D] px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-white">Chat del centro</p>
            <button onClick={cerrar} className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => setSelectorEstadoAbierto((v) => !v)}
              className="flex w-full items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
            >
              <Circle className={`h-2 w-2 fill-current ${miEstado === "DISPONIBLE" ? "text-emerald-400" : miEstado === "AUSENTE" ? "text-amber-400" : "text-slate-400"}`} />
              {ESTADO_LABEL[miEstado]}
            </button>
            {selectorEstadoAbierto && (
              <div className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-lg bg-white py-1 shadow-lg">
                {(["DISPONIBLE", "AUSENTE", "DESCONECTADO"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => handleCambiarEstado(e)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <span className={`h-2 w-2 rounded-full ${ESTADO_COLOR[e]}`} />
                    {ESTADO_LABEL[e]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-slate-100 p-2">
          {buscandoNuevo ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={busquedaNuevo}
                onChange={(e) => setBusquedaNuevo(e.target.value)}
                placeholder="Escribe un nombre..."
                className="w-full rounded-lg border border-[#FD5249] bg-white py-1.5 pl-8 pr-7 text-xs outline-none"
              />
              <button
                onClick={() => {
                  setBuscandoNuevo(false);
                  setBusquedaNuevo("");
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {busquedaNuevo.trim().length >= 1 && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {resultadosNuevo.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">Sin resultados.</p>
                  ) : (
                    resultadosNuevo.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => empezarConversacionNueva(u)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                      >
                        <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          {u.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                              {u.nombre.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="truncate text-xs font-medium text-slate-700">{u.nombre}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en tus chats..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#FD5249]"
              />
              <button
                onClick={() => setBuscandoNuevo(true)}
                title="Empezar una conversación nueva"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FD5249] text-white hover:bg-[#D7463E]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="mt-8 px-3 text-center text-xs text-slate-400">
              {busqueda ? "Sin resultados." : "Todavía no tienes ninguna conversación. Usa el botón + para empezar una."}
            </p>
          ) : (
            filtrados.map((u) => (
              <button
                key={u.id}
                onClick={() => abrirConversacion(u)}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100 ${
                  conversacionCon?.id === u.id ? "bg-white" : ""
                }`}
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200">
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                      {u.nombre.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-50 ${ESTADO_COLOR[u.estadoPresencia]}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{u.nombre}</p>
                  <p className="truncate text-xs text-slate-400">{u.ultimoMensaje ?? "Sin mensajes todavía"}</p>
                </div>
                {u.noLeidos > 0 && (
                  <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#FD5249] px-1 text-[10px] font-bold text-white">
                    {u.noLeidos}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Columna derecha: la conversación con quien esté seleccionado. */}
      <div className={`w-full flex-1 flex-col sm:flex ${conversacionCon ? "flex" : "hidden"}`}>
        {conversacionCon ? (
          <>
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
              <button onClick={() => setConversacionCon(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 sm:hidden">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                {conversacionCon.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={conversacionCon.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                    {conversacionCon.nombre.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${ESTADO_COLOR[conversacionCon.estadoPresencia]}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0B1D4D]">{conversacionCon.nombre}</p>
                <p className="text-[11px] text-slate-400">{ESTADO_LABEL[conversacionCon.estadoPresencia]}</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
              {mensajes.length === 0 ? (
                <p className="mt-6 text-center text-xs text-slate-400">Escribe el primer mensaje.</p>
              ) : (
                mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.esMio ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.esMio ? "bg-[#FD5249] text-white" : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                      <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${m.esMio ? "text-white/70" : "text-slate-400"}`}>
                        {tiempoRelativo(m.createdAt)}
                        {m.esMio && (m.leido ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 p-2.5">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleEnviar();
                  }
                }}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-full border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-[#FD5249]"
              />
              <button
                onClick={handleEnviar}
                disabled={!texto.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FD5249] text-white hover:bg-[#D7463E] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Circle className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-semibold text-slate-500">Elige a alguien de la lista</p>
            <p className="max-w-[220px] text-xs text-slate-400">Selecciona un usuario a la izquierda para empezar a chatear.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
