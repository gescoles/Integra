"use client";

import { createContext, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLocale } from "./i18n";
import { updateMyLocale } from "./localeActions";

// Tiempo mínimo que se mantiene visible la transición de guardado, aunque
// el guardado real termine antes: en local (o con buena conexión) puede
// tardar solo unos milisegundos, y sin este mínimo el efecto "parpadea"
// tan rápido que no se llega a ver.
const DURACION_MINIMA_MS = 900;

type SchoolInfo = {
  id: string;
  name: string;
  logoUrl: string | null;
} | null;

type DashboardMeta = {
  school: SchoolInfo;
  avatarUrl: string | null;
  setAvatarUrl: (url: string) => void;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  guardando: boolean;
  guardandoMensaje: string | null;
  empezarGuardado: (mensaje?: string) => void;
  terminarGuardado: () => void;
};

const DashboardMetaContext = createContext<DashboardMeta>({
  school: null,
  avatarUrl: null,
  setAvatarUrl: () => {},
  locale: "ES",
  setLocale: () => {},
  guardando: false,
  guardandoMensaje: null,
  empezarGuardado: () => {},
  terminarGuardado: () => {},
});

export function SchoolProvider({
  school,
  avatarUrl: initialAvatarUrl,
  locale: initialLocale,
  children,
}: {
  school: SchoolInfo;
  avatarUrl: string | null;
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  // El contador de verdad vive en una ref (no en estado), porque solo nos
  // hace falta para decidir cuándo ocultar; lo que sí es estado es la
  // visibilidad, que es lo único que necesita volver a pintar la pantalla.
  const contadorRef = useRef(0);
  const mostradoDesdeRef = useRef<number | null>(null);
  const timerOcultarRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [guardandoVisible, setGuardandoVisible] = useState(false);
  const [guardandoMensaje, setGuardandoMensaje] = useState<string | null>(null);
  const router = useRouter();

  function empezarGuardado(mensaje?: string) {
    contadorRef.current += 1;
    if (mensaje) setGuardandoMensaje(mensaje);
    if (timerOcultarRef.current) {
      clearTimeout(timerOcultarRef.current);
      timerOcultarRef.current = null;
    }
    if (!guardandoVisible) {
      mostradoDesdeRef.current = Date.now();
      setGuardandoVisible(true);
    }
  }

  function terminarGuardado() {
    contadorRef.current = Math.max(0, contadorRef.current - 1);
    if (contadorRef.current > 0) return;

    const transcurrido = Date.now() - (mostradoDesdeRef.current ?? Date.now());
    const restante = DURACION_MINIMA_MS - transcurrido;

    if (restante > 0) {
      timerOcultarRef.current = setTimeout(() => {
        if (contadorRef.current === 0) {
          setGuardandoVisible(false);
          setGuardandoMensaje(null);
        }
      }, restante);
    } else {
      setGuardandoVisible(false);
      setGuardandoMensaje(null);
    }
  }

  function setLocale(next: AppLocale) {
    // Cambio instantáneo en la interfaz; el guardado en la base de datos
    // ocurre en paralelo, así el usuario no espera a que termine la petición.
    setLocaleState(next);
    updateMyLocale(next)
      .then(() => {
        // El contenido que se renderiza en el servidor (títulos, textos de
        // cada página) necesita un refresco para leer el nuevo idioma ya
        // guardado; los componentes de cliente (sidebar, menús) ya han
        // cambiado al instante gracias al estado de arriba.
        router.refresh();
      })
      .catch(() => {
        // Si falla el guardado, no revertimos la interfaz para no confundir al
        // usuario a media sesión; se reintentará en el próximo cambio o login.
      });
  }

  return (
    <DashboardMetaContext.Provider
      value={{ school, avatarUrl, setAvatarUrl, locale, setLocale, guardando: guardandoVisible, guardandoMensaje, empezarGuardado, terminarGuardado }}
    >
      {children}
    </DashboardMetaContext.Provider>
  );
}

export function useSchoolInfo() {
  return useContext(DashboardMetaContext).school;
}

export function useUserAvatar() {
  const { avatarUrl, setAvatarUrl } = useContext(DashboardMetaContext);
  return { avatarUrl, setAvatarUrl };
}

export function useLocale() {
  const { locale, setLocale } = useContext(DashboardMetaContext);
  return { locale, setLocale };
}

export function useSavingOverlay() {
  const { guardando, guardandoMensaje, empezarGuardado, terminarGuardado } = useContext(DashboardMetaContext);
  return { guardando, guardandoMensaje, empezarGuardado, terminarGuardado };
}

/**
 * Como useTransition normal, pero además enciende y apaga la transición de
 * pantalla completa automáticamente. Pensado para botones que no muestran
 * su propio spinner (como los de la papelera de borrar, o aprobar/rechazar),
 * que hasta ahora no disparaban el efecto de guardado.
 */
export function useGuardadoTransition() {
  const [isPending, startTransitionBase] = useState(false);
  const { empezarGuardado, terminarGuardado } = useSavingOverlay();

  function startTransition(accion: () => Promise<void> | void) {
    startTransitionBase(true);
    empezarGuardado();
    Promise.resolve(accion()).finally(() => {
      startTransitionBase(false);
      terminarGuardado();
    });
  }

  return [isPending, startTransition] as const;
}
