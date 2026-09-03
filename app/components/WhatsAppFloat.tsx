"use client";

import { useEffect, useState } from "react";

// Número de contacto de Docentium — con el prefijo de España (34) para
// que el enlace de WhatsApp funcione tal cual, sin que el usuario tenga
// que teclear el prefijo él mismo.
const NUMERO_WHATSAPP = "34711203121";
const MENSAJE_PRECARGADO = "Hola, vengo desde la web de Docentium y quería hacer una consulta.";

function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.9 14.02c-.25.7-1.45 1.34-2 1.42-.51.08-1.15.11-1.86-.12-.43-.14-.98-.32-1.69-.62-2.97-1.28-4.91-4.28-5.06-4.48-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.6-.37.8-.37.2 0 .4 0 .58.01.19.01.44-.07.68.52.25.6.85 2.07.92 2.22.07.15.12.33.02.53-.1.2-.15.32-.3.5-.15.18-.31.4-.44.53-.15.15-.3.31-.13.61.17.3.76 1.26 1.64 2.04 1.13 1 2.08 1.31 2.38 1.46.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.78.84 2.08 1 .3.15.5.22.58.35.07.13.07.75-.18 1.45z" />
    </svg>
  );
}

export function WhatsAppFloat() {
  const [avisoVisible, setAvisoVisible] = useState(false);

  useEffect(() => {
    // Pequeño margen antes de mostrar el aviso, para que no salte de
    // golpe nada más cargar la página.
    const id = setTimeout(() => setAvisoVisible(true), 1800);
    return () => clearTimeout(id);
  }, []);

  return (
    <a
      href={`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(MENSAJE_PRECARGADO)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setAvisoVisible(false)}
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
      className="animate-float fixed bottom-5 right-5 z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
    >
      <IconoWhatsApp className="h-8 w-8" />

      {avisoVisible && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white ring-2 ring-white">
            1
          </span>
        </span>
      )}
    </a>
  );
}
