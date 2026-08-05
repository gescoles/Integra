"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLocale } from "./i18n";
import { updateMyLocale } from "./localeActions";

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
};

const DashboardMetaContext = createContext<DashboardMeta>({
  school: null,
  avatarUrl: null,
  setAvatarUrl: () => {},
  locale: "ES",
  setLocale: () => {},
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
  const router = useRouter();

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
    <DashboardMetaContext.Provider value={{ school, avatarUrl, setAvatarUrl, locale, setLocale }}>
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
