"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Landmark,
  Users,
  Menu,
  X,
  AlertTriangle,
  FolderKanban,
  Building2,
  Brain,
  GraduationCap,
  ShieldCheck,
  Clock,
  DatabaseBackup,
  BookOpen,
  Briefcase,
  UsersRound,
  ShieldAlert,
  Lock,
  CalendarClock,
  CalendarDays,
  Bus,
  CheckSquare,
  Bot,
  Newspaper,
  MessageCircle,
  Handshake,
  Award,
  Search,
  HelpCircle,
  ClipboardCheck,
} from "lucide-react";
import { HexLogo } from "@/app/components/Logo";
import { ROLE_LABELS_FULL } from "../constants";
import { SchoolBadge } from "./SchoolBadge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserProfileButton } from "./UserProfileButton";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { useLocale, useChatInterno, useSidebarColapsado, useDoqui } from "../SchoolContext";
import { useIsNativeApp } from "../hooks/useIsNativeApp";
import { BuscadorGlobal } from "./BuscadorGlobal";
import { buscarAlumnosGlobal } from "../busquedaActions";
import { translate, TranslationKey } from "../i18n";

const superadminSections: {
  titulo: string;
  descripcion: string;
  items: { href: string; labelKey: TranslationKey; icon: typeof Home }[];
}[] = [
  {
    titulo: "General",
    descripcion: "Tu resumen y, si tienes, tus propios alumnos asignados.",
    items: [
      { href: "/dashboard", labelKey: "nav.inicio", icon: Home },
      { href: "/dashboard/mis-alumnos", labelKey: "nav.alumnos", icon: GraduationCap },
    ],
  },
  {
    titulo: "Centros y usuarios",
    descripcion: "Da de alta centros nuevos y gestiona quién trabaja en cada uno.",
    items: [
      { href: "/dashboard/centros", labelKey: "nav.centros", icon: Landmark },
      { href: "/dashboard/usuarios", labelKey: "nav.usuarios", icon: Users },
    ],
  },
  {
    titulo: "Módulos de los centros",
    descripcion: "Las mismas herramientas del día a día que usan los centros, vistas desde aquí.",
    items: [
      { href: "/dashboard/tutorias", labelKey: "nav.tutorias", icon: Users },
      { href: "/dashboard/guardias", labelKey: "nav.guardias", icon: ShieldCheck },
      { href: "/dashboard/material", labelKey: "nav.material", icon: BookOpen },
      { href: "/dashboard/practicas", labelKey: "nav.practicas", icon: Briefcase },
      { href: "/dashboard/expedientes", labelKey: "nav.expedientes", icon: AlertTriangle },
      { href: "/dashboard/onboarding", labelKey: "nav.onboarding", icon: FolderKanban },
      { href: "/dashboard/espacios", labelKey: "nav.espacios", icon: Building2 },
      { href: "/dashboard/psicopedagogia", labelKey: "nav.psicopedagogia", icon: Brain },
      { href: "/dashboard/justificantes", labelKey: "nav.justificantes", icon: ClipboardCheck },
      { href: "/dashboard/salidas", labelKey: "nav.salidas", icon: Bus },
      { href: "/dashboard/salidas/aprobaciones", labelKey: "nav.aprobaciones", icon: CheckSquare },
      { href: "/dashboard/calendario", labelKey: "nav.calendario", icon: CalendarDays },
      { href: "/dashboard/horario", labelKey: "nav.horario", icon: CalendarClock },
    ],
  },
  {
    titulo: "Plataforma",
    descripcion: "Ajustes generales de Docentium, no de un centro en concreto.",
    items: [
      { href: "/dashboard/roles", labelKey: "nav.roles", icon: ShieldCheck },
      { href: "/dashboard/superadmin/departamentos", labelKey: "nav.departamentosAdmin", icon: Building2 },
      { href: "/dashboard/superadmin/certificaciones-catalogo", labelKey: "nav.certificacionesCatalogo", icon: Award },
      { href: "/dashboard/superadmin/seguridad", labelKey: "nav.seguridadAccesos", icon: ShieldAlert },
      // Desactivados de momento a petición: todavía no hacen nada.
      // { href: "/dashboard/planes", labelKey: "nav.planes", icon: CreditCard },
      // { href: "/dashboard/auditoria", labelKey: "nav.auditoria", icon: Clock },
      { href: "/dashboard/chatbot-admin", labelKey: "nav.chatbotAdmin", icon: Bot },
      { href: "/dashboard/noticias-admin", labelKey: "nav.noticiasAdmin", icon: Newspaper },
      // { href: "/dashboard/configuracion", labelKey: "nav.configuracion", icon: Settings },
    ],
  },
  {
    titulo: "Copia de seguridad",
    descripcion: "Genera una copia de toda la base de datos, o restaura una anterior si hace falta.",
    items: [{ href: "/dashboard/backup", labelKey: "nav.backup", icon: DatabaseBackup }],
  },
];

// Módulos reales, construidos y ya funcionando — su visibilidad depende de si
// el centro del usuario los tiene contratados (School.modules).
const centroModulos: { key: string; href: string; labelKey: TranslationKey; icon: typeof Users }[] = [
  { key: "tutorias", href: "/dashboard/tutorias", labelKey: "nav.tutorias", icon: Users },
  { key: "practicas", href: "/dashboard/practicas", labelKey: "nav.practicas", icon: Briefcase },
  { key: "salidas", href: "/dashboard/salidas", labelKey: "nav.salidas", icon: Bus },
  { key: "expedientes", href: "/dashboard/expedientes", labelKey: "nav.expedientes", icon: AlertTriangle },
  { key: "guardias", href: "/dashboard/guardias", labelKey: "nav.guardias", icon: ShieldCheck },
  { key: "material", href: "/dashboard/material", labelKey: "nav.material", icon: BookOpen },
  { key: "justificantes", href: "/dashboard/justificantes", labelKey: "nav.justificantes", icon: ClipboardCheck },
  { key: "psicopedagogia", href: "/dashboard/psicopedagogia", labelKey: "nav.psicopedagogia", icon: Brain },
  { key: "espacios", href: "/dashboard/espacios", labelKey: "nav.espacios", icon: Building2 },
  { key: "certificaciones", href: "/dashboard/certificaciones", labelKey: "nav.certificaciones", icon: Award },
  { key: "empresas", href: "/dashboard/empresas", labelKey: "nav.empresas", icon: Handshake },
  { key: "onboarding", href: "/dashboard/onboarding", labelKey: "nav.onboarding", icon: FolderKanban },
];

// Utilidades (Calendario y Horario): igual que los módulos de arriba, solo
// se activan si el centro las tiene contratadas ("utilidades" en modules).
const utilidadesModulos: { key: string; href: string; labelKey: TranslationKey; icon: typeof Users }[] = [
  { key: "utilidades", href: "/dashboard/calendario", labelKey: "nav.calendario", icon: CalendarDays },
  { key: "utilidades", href: "/dashboard/horario", labelKey: "nav.miHorario", icon: CalendarClock },
];

// Funcionalidades que todavía no existen para nadie, independientemente del plan
const centroProximamente = [
  { label: "Coordinación", icon: UsersRound },
  { label: "Disciplina", icon: ShieldAlert },
];

export function Sidebar({
  userName,
  userEmail,
  role,
  esTicDelCentro = false,
  esPsicopedagogaDelCentro = false,
  contractedModules = [],
}: {
  userName: string;
  userEmail: string;
  role: string;
  esTicDelCentro?: boolean;
  esPsicopedagogaDelCentro?: boolean;
  contractedModules?: string[];
}) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { totalNoLeidos, abrir: abrirChat, notificaciones: notificacionesChat } = useChatInterno();
  const doqui = useDoqui();
  const { colapsado: sidebarColapsado, toggle: toggleSidebar } = useSidebarColapsado();
  const [chatNotifAbierto, setChatNotifAbierto] = useState(false);
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<{ id: string; nombre: string; curso: string; avatarUrl: string | null }[]>([]);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const extras: string[] = [];
  if (esPsicopedagogaDelCentro) extras.push("Psicopedagoga/a");
  if (esTicDelCentro) extras.push("TIC");
  const roleLabel = [ROLE_LABELS_FULL[role] ?? role, ...extras].join(" - ");
  const isSuperAdmin = role === "SUPERADMIN";
  const [mobileOpen, setMobileOpen] = useState(false);
  const esNativo = useIsNativeApp();

  // Para la barra de navegación inferior (solo dentro de la app Android):
  // Disciplina (Expedientes) va siempre primero si está contratada, y
  // luego se rellena con el resto de módulos por su orden de prioridad
  // habitual — el resto se sigue viendo igual abriendo el menú completo
  // con el botón de arriba a la izquierda (no hace falta repetirlo abajo).
  const modulosBarraInferior = [
    ...centroModulos.filter((m) => m.key === "expedientes"),
    ...centroModulos.filter((m) => m.key !== "expedientes"),
  ]
    .filter((m) => contractedModules.includes(m.key))
    .slice(0, 4);

  // Título de la página actual, para que la barra superior en la app
  // Android muestre "Guardias"/"Material"/... en vez de quedarse vacía,
  // como hace cualquier app nativa (no un buscador enorme, que ahí no
  // cabe). En el navegador esto no se usa para nada.
  const todosLosItems = [...centroModulos, ...utilidadesModulos];
  const itemActual = todosLosItems.find((m) => m.href === pathname);
  const tituloPaginaActual =
    pathname === "/dashboard"
      ? translate(locale, "nav.inicio")
      : pathname === "/dashboard/mis-alumnos"
        ? translate(locale, "nav.misAlumnos")
        : itemActual
          ? translate(locale, itemActual.labelKey)
          : "Docentium";

  // En cuanto se navega a otra página, cerramos el menú deslizante del
  // móvil solo — así no hay que acordarse de cerrarlo a mano en cada enlace.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Búsqueda de alumnos en la barra superior, con una pequeña pausa
  // (debounce) para no lanzar una consulta en cada letra que se escribe.
  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    const id = setTimeout(() => {
      buscarAlumnosGlobal(busqueda).then(setResultadosBusqueda);
    }, 300);
    return () => clearTimeout(id);
  }, [busqueda]);

  // Un icono de la barra inferior: fondo en forma de píldora detrás del
  // icono cuando está activo (como Wallapop/Instagram), en vez de un
  // simple cambio de color, más un pequeño "hundido" al tocar para que
  // se note el toque igual que en cualquier app nativa.
  function ItemBarraInferior({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-semibold transition-transform active:scale-95"
      >
        <span
          className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
            active
              ? "bg-[#FD5249]/15 text-[#FD5249] dark:bg-[#FD5249]/25"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className={`max-w-full truncate ${active ? "text-[#FD5249]" : "text-slate-500 dark:text-slate-400"}`}>{label}</span>
      </Link>
    );
  }

  return (
    <>
      {/* Barra superior, siempre visible (no solo en móvil): menú/logo en
          móvil, buscador, chat, notificaciones, ayuda y el usuario con su
          desplegable. El padding-top extra respeta la "zona segura" del
          teléfono (barra de estado, notch) — sin esto, en la app envuelta
          con Capacitor esta barra queda escondida detrás de la hora/batería
          del sistema. */}
      <div className={`fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] lg:px-6 ${sidebarColapsado ? "" : "lg:left-64"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileOpen(true);
              } else {
                toggleSidebar();
              }
            }}
            aria-label="Abrir/cerrar menú"
            className="rounded-lg p-1.5 text-[#0B1D4D] hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Buscador global: alumnos, profesorado, empresas y grupos, todo
            desde un solo sitio — no toca la lógica de ningún módulo, solo
            hace consultas de lectura propias. */}
        <div className="hidden flex-1 sm:block">
          <BuscadorGlobal />
        </div>

        <div className="flex-1 truncate sm:hidden">
          {esNativo && (
            <span className="text-base font-bold text-[#0B1D4D]">{tituloPaginaActual}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {contractedModules.includes("comunicacion") && (
            <div className="relative">
              <button
                onClick={() => setChatNotifAbierto((v) => !v)}
                aria-label="Chat"
                className="relative rounded-lg border border-slate-200 bg-white p-2.5 hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4 text-slate-500" />
                {totalNoLeidos > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {totalNoLeidos > 99 ? "99+" : totalNoLeidos}
                  </span>
                )}
              </button>

              {chatNotifAbierto && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setChatNotifAbierto(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 px-3.5 py-2.5 text-sm font-bold text-[#0B1D4D]">
                      Mensajes
                    </div>
                    {notificacionesChat.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-slate-400">No tienes mensajes nuevos.</p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        {notificacionesChat.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => {
                              setChatNotifAbierto(false);
                              abrirChat(n.id);
                            }}
                            className="flex w-full items-center gap-2.5 border-b border-slate-50 px-3.5 py-2.5 text-left hover:bg-slate-50"
                          >
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                              {n.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={n.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                                  {n.nombre.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-700">{n.nombre}</p>
                              <p className="truncate text-xs text-slate-400">{n.texto}</p>
                            </div>
                            {n.cantidad > 1 && (
                              <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#FD5249] px-1 text-[10px] font-bold text-white">
                                {n.cantidad}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setChatNotifAbierto(false);
                        abrirChat();
                      }}
                      className="w-full border-t border-slate-100 px-3.5 py-2.5 text-center text-xs font-semibold text-[#FD5249] hover:bg-slate-50"
                    >
                      Abrir chat
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <NotificationBell />

          <ThemeToggle />

          <button
            onClick={() => doqui.abrir()}
            aria-label="Ayuda"
            title="Ayuda"
            className="hidden rounded-lg border border-slate-200 bg-white p-2.5 text-slate-400 hover:bg-slate-50 sm:block"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          <div className="ml-1 h-8 w-px bg-slate-200" />

          <UserProfileButton userName={userName} userEmail={userEmail} roleLabel={roleLabel} locale={locale} />
        </div>
      </div>

      {/* Fondo oscuro al abrir el menú en móvil */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0B1D4D] transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarColapsado ? "lg:-translate-x-full" : "lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between gap-2.5 px-6 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:pt-4">
          <div className="flex items-center gap-2.5">
            <HexLogo size={44} />
            <div className="leading-tight">
              <div className="text-base font-bold text-white">Docentium</div>
              <div className="text-[10px] text-slate-400">
                Gestión inteligente para centros educativos
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

      <nav className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-4">
        {isSuperAdmin &&
          superadminSections.map((seccion, i) => (
            <div key={seccion.titulo} className={i > 0 ? "mt-4" : undefined}>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {seccion.titulo}
              </div>
              {seccion.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#FD5249] text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {translate(locale, item.labelKey)}
                  </Link>
                );
              })}
            </div>
          ))}

        {!isSuperAdmin && (
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/dashboard"
                ? "bg-[#FD5249] text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Home className="h-4 w-4" />
            {translate(locale, "nav.inicio")}
          </Link>
        )}

        {/* "Mis alumnos" no depende de ningún módulo contratado: varios
            módulos (Tutorías, Prácticas, Expedientes) necesitan que exista
            esta ficha de alumnos, así que siempre está disponible.
            Coordinación/Dirección ven, además, la opción de consultar todo
            el centro (no solo sus propios alumnos tutorizados). */}
        {!isSuperAdmin && (role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION" || role === "DIRECCION") && (
          <div className="pt-1">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {translate(locale, "nav.alumnos")}
            </div>
            <Link
              href="/dashboard/mis-alumnos"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/dashboard/mis-alumnos"
                  ? "bg-[#FD5249] text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              {translate(locale, "nav.misAlumnos")}
            </Link>
            <Link
              href="/dashboard/mis-alumnos?vista=centro"
              className="ml-6 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Users className="h-3.5 w-3.5" />
              {translate(locale, "nav.alumnosCentro")}
            </Link>
          </div>
        )}

        {!isSuperAdmin && role === "COORDINADOR" && (
          <Link
            href="/dashboard/mi-departamento"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/dashboard/mi-departamento"
                ? "bg-[#FD5249] text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Building2 className="h-4 w-4" />
            {translate(locale, "nav.miDepartamento")}
          </Link>
        )}

        {!isSuperAdmin && (role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION" || role === "DIRECCION") && (
          <Link
            href="/dashboard/grupos"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/dashboard/grupos"
                ? "bg-[#FD5249] text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            {translate(locale, "nav.grupos")}
          </Link>
        )}

        {!isSuperAdmin && role === "PROFESOR" && (
          <Link
            href="/dashboard/mis-alumnos"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/dashboard/mis-alumnos"
                ? "bg-[#FD5249] text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            {translate(locale, "nav.misAlumnos")}
          </Link>
        )}

        {!isSuperAdmin && (
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {translate(locale, "nav.modulosDelCentro")}
          </div>
        )}
        {!isSuperAdmin &&
          [...centroModulos]
            .sort((a, b) => {
              const aContratado = contractedModules.includes(a.key);
              const bContratado = contractedModules.includes(b.key);
              if (aContratado === bContratado) return 0;
              return aContratado ? -1 : 1;
            })
            .map((item) => {
            const contratado = contractedModules.includes(item.key);
            const active = pathname === item.href;

            if (!contratado) {
              return (
                <div
                  key={item.key}
                  title={translate(locale, "nav.moduloNoContratado")}
                  className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {translate(locale, item.labelKey)}
                  </span>
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                </div>
              );
            }

            return (
              <Fragment key={item.key}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#FD5249] text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {translate(locale, item.labelKey)}
                </Link>

                {/* "Aprobaciones" es un submenú de Salidas en concreto, así
                    que va justo debajo de ese enlace, no del último módulo
                    de toda la lista. */}
                {item.key === "salidas" && (role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION" || role === "DIRECCION") && (
                  <Link
                    href="/dashboard/salidas/aprobaciones"
                    className={`ml-6 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      pathname === "/dashboard/salidas/aprobaciones"
                        ? "bg-[#FD5249] text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {translate(locale, "nav.aprobaciones")}
                  </Link>
                )}
              </Fragment>
            );
          })}

        {!isSuperAdmin && (
          <div className="pt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {translate(locale, "nav.utilidades")}
            </div>
            {[...utilidadesModulos]
              .sort((a, b) => {
                const aContratado = contractedModules.includes(a.key);
                const bContratado = contractedModules.includes(b.key);
                if (aContratado === bContratado) return 0;
                return aContratado ? -1 : 1;
              })
              .map((item) => {
              const contratado = contractedModules.includes(item.key);
              const active = pathname === item.href;

              if (!contratado) {
                return (
                  <div
                    key={item.href}
                    title={translate(locale, "nav.moduloNoContratado")}
                    className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {translate(locale, item.labelKey)}
                    </span>
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#FD5249] text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {translate(locale, item.labelKey)}
                </Link>
              );
            })}
          </div>
        )}

        {!isSuperAdmin && (
          <div className="pt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {translate(locale, "nav.proximamente")}
            </div>
            {centroProximamente.map((item) => (
              <div
                key={item.label}
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500"
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-400">
                  {translate(locale, "nav.proximamente")}
                </span>
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <LanguageSwitcher variant="dark" />
        {!isSuperAdmin && (
          <div className="mb-1.5">
            <SchoolBadge variant="dark" compact />
          </div>
        )}
      </div>
    </aside>

    {/* Barra de navegación inferior: solo dentro de la app Android
        (Capacitor) — en el navegador normal esto no se pinta y todo
        sigue exactamente igual que antes (menú lateral de siempre). Es
        solo otra forma de llegar a las mismas rutas de siempre, con
        zonas de toque grandes, como cualquier app nativa. */}
    {esNativo && (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200/70 bg-white/60 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_16px_rgba(15,23,42,0.08)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-[#0B1D4D]/60 dark:shadow-[0_-2px_16px_rgba(0,0,0,0.35)] lg:hidden"
        aria-label="Navegación principal"
      >
        <ItemBarraInferior href="/dashboard" icon={Home} label={translate(locale, "nav.inicio")} />

        {isSuperAdmin ? (
          <>
            <ItemBarraInferior href="/dashboard/centros" icon={Landmark} label={translate(locale, "nav.centros")} />
            <ItemBarraInferior href="/dashboard/usuarios" icon={Users} label={translate(locale, "nav.usuarios")} />
          </>
        ) : (
          modulosBarraInferior.map((item) => (
            <ItemBarraInferior key={item.key} href={item.href} icon={item.icon} label={translate(locale, item.labelKey)} />
          ))
        )}
      </nav>
    )}
    </>
  );
}
