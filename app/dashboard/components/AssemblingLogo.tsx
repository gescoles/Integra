"use client";

import { DOCENTIUM_MODULES } from "../../components/docentiumModules";

/**
 * Loader animado de Docentium que se muestra al entrar al panel y siempre
 * que se guarda, crea o borra algo. En vez de un simple giro, los módulos
 * de la app (Calendario, Guardias, Expedientes, Material...) orbitan
 * alrededor del monograma "DC", como si se movieran entre ellos — el
 * mismo espíritu que el loader de Google, pero con nuestros propios
 * módulos en vez de figuras genéricas.
 */
export function AssemblingLogo({ size = 140 }: { size?: number }) {
  const centerSize = size * 0.38;
  const moduleSize = size * 0.3;
  const radius = size / 2 - moduleSize / 2;
  const left = radius - moduleSize / 2;
  const top = -moduleSize / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Anillo de módulos orbitando */}
      <div
        className="docentium-orbit absolute inset-0"
        style={{ ["--docentium-orbit-duration" as string]: "5s" }}
      >
        {DOCENTIUM_MODULES.map(({ Icon, angle }, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{ width: 0, height: 0, transform: `rotate(${angle}deg)` }}
          >
            <div
              className="docentium-module-pulse absolute flex items-center justify-center rounded-full shadow-md"
              style={{
                width: moduleSize,
                height: moduleSize,
                left,
                top,
                animationDelay: `${i * 0.18}s`,
                backgroundColor: i % 2 === 0 ? "#FD5249" : "#111111",
              }}
            >
              <div className="docentium-counter-spin flex h-full w-full items-center justify-center">
                <Icon
                  style={{ width: moduleSize * 0.54, height: moduleSize * 0.54 }}
                  className="text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monograma central */}
      <div
        className="docentium-center-pulse absolute left-1/2 top-1/2 flex items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5"
        style={{
          width: centerSize,
          height: centerSize,
          marginLeft: -centerSize / 2,
          marginTop: -centerSize / 2,
        }}
      >
        <span
          style={{ fontSize: centerSize * 0.44 }}
          className="font-black leading-none tracking-tight text-black"
        >
          D<span className="text-[#FD5249]">C</span>
        </span>
      </div>

      <style>{`
        @keyframes docentium-orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes docentium-counter-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes docentium-module-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
        @keyframes docentium-center-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        .docentium-orbit {
          animation: docentium-orbit-spin var(--docentium-orbit-duration, 5s) linear infinite;
        }
        .docentium-counter-spin {
          animation: docentium-counter-spin var(--docentium-orbit-duration, 5s) linear infinite;
        }
        .docentium-module-pulse {
          animation: docentium-module-pulse 1.7s ease-in-out infinite;
        }
        .docentium-center-pulse {
          animation: docentium-center-pulse 1.9s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
