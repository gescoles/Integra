import { DOCENTIUM_MODULES } from "./docentiumModules";

/**
 * Marca de Docentium: el monograma "DC" (D en negro, C en naranja) con los
 * módulos de la app alrededor, en anillo. Es 100% vectorial (SVG), así que
 * se ve nítida en cualquier tamaño — nada de imágenes rasterizadas que se
 * emborronan al achicarlas.
 *
 * Por debajo de ~40px los iconos del anillo no caben con claridad, así que
 * en tamaños pequeños se muestra solo el monograma; a partir de ahí se ve
 * la marca completa con los módulos, igual que en la animación de carga.
 */
export function HexLogo({ size = 36 }: { size?: number }) {
  const showModules = size >= 40;
  const centerSize = showModules ? size * 0.42 : size;
  const moduleSize = size * 0.28;
  const radius = size / 2 - moduleSize / 2;
  const left = radius - moduleSize / 2;
  const top = -moduleSize / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {showModules && (
        <div className="absolute inset-0">
          {DOCENTIUM_MODULES.map(({ Icon, angle }, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{ width: 0, height: 0, transform: `rotate(${angle}deg)` }}
            >
              <div
                className="absolute flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
                style={{ width: moduleSize, height: moduleSize, left, top }}
              >
                <Icon
                  style={{
                    width: moduleSize * 0.56,
                    height: moduleSize * 0.56,
                    transform: `rotate(${-angle}deg)`,
                  }}
                  className={i % 2 === 0 ? "text-[#FD5249]" : "text-[#111111]"}
                  strokeWidth={2.5}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
        style={{
          width: centerSize,
          height: centerSize,
          marginLeft: -centerSize / 2,
          marginTop: -centerSize / 2,
        }}
      >
        <span
          style={{ fontSize: centerSize * 0.46 }}
          className="font-black leading-none tracking-tight text-black"
        >
          D<span className="text-[#FD5249]">C</span>
        </span>
      </div>
    </div>
  );
}

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isLight = variant === "light";
  return (
    <div className="flex items-center gap-2.5">
      <HexLogo size={44} />
      <div className="leading-tight">
        <div className={`text-lg font-bold ${isLight ? "text-white" : "text-[#0B1D4D]"}`}>
          Docentium
        </div>
        <div className={`text-[11px] ${isLight ? "text-slate-300" : "text-slate-500"}`}>
          Gestión inteligente para centros educativos
        </div>
      </div>
    </div>
  );
}
