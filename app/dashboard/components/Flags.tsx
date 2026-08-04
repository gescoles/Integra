import { AppLocale } from "../i18n";

// Emojis de bandera fallan a menudo en Windows (se ven como "ES"/"GB" en vez
// de la imagen), así que usamos SVG propios: fiables en cualquier sistema.
// Cataluña no tiene bandera propia en el estándar Unicode, así que la
// dibujamos igualmente (la Senyera) para que quede reconocible y "chula".

function SpainFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className}>
      <rect width="3" height="2" fill="#AA151B" />
      <rect y="0.5" width="3" height="1" fill="#F1BF00" />
    </svg>
  );
}

function UKFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className}>
      <rect width="60" height="30" fill="#00247D" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#CF142B" strokeWidth="2" />
      <path d="M30,0 30,30 M0,15 60,15" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 30,30 M0,15 60,15" stroke="#CF142B" strokeWidth="6" />
    </svg>
  );
}

function CataloniaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 810 540" className={className}>
      <rect width="810" height="540" fill="#FCDD09" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} y={60 + i * 120} width="810" height="60" fill="#DA121A" />
      ))}
    </svg>
  );
}

export function LocaleFlag({ locale, className = "h-full w-full" }: { locale: AppLocale; className?: string }) {
  if (locale === "ES") return <SpainFlag className={className} />;
  if (locale === "EN") return <UKFlag className={className} />;
  return <CataloniaFlag className={className} />;
}
