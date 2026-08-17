import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.docentium.app",
  appName: "Docentium",
  // No usamos un build estático de Next.js dentro de la app (App Router
  // con Server Actions no se puede exportar como HTML estático). En su
  // lugar, la app nativa simplemente abre tu web ya desplegada en Vercel
  // dentro de un WebView a pantalla completa, con icono y splash propios.
  // "webDir" es obligatorio para Capacitor aunque no se use su contenido
  // en este modo — apunta a la carpeta placeholder www/.
  webDir: "www",
  server: {
    url: "https://doc3ntium.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
