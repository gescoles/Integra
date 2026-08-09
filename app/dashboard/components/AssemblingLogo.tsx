"use client";

/**
 * Logo animado que se muestra siempre que se guarda, crea o borra algo en
 * la app. Gira suavemente sin parar y "respira" (pulso de escala) mientras
 * dure la operación, para dar sensación de que está trabajando.
 */
export function AssemblingLogo({ size = 56 }: { size?: number }) {
  return (
    <div
      className="animate-spin-slow relative"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 animate-pulse-soft rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/logo.png"
          alt="Integra"
          width={size}
          height={size}
          className="h-full w-full rounded-full object-cover shadow-lg"
        />
      </div>
      <style>{`
        @keyframes integra-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes integra-pulse-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .animate-spin-slow {
          animation: integra-spin-slow 2.2s linear infinite;
        }
        .animate-pulse-soft {
          animation: integra-pulse-soft 1.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
