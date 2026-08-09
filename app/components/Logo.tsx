export function HexLogo({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/branding/logo.png"
      alt="Integra"
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isLight = variant === "light";
  return (
    <div className="flex items-center gap-2.5">
      <HexLogo size={36} />
      <div className="leading-tight">
        <div className={`text-lg font-bold ${isLight ? "text-white" : "text-[#0B1D4D]"}`}>
          Integra
        </div>
        <div className={`text-[11px] ${isLight ? "text-slate-300" : "text-slate-500"}`}>
          Gestión inteligente para centros educativos
        </div>
      </div>
    </div>
  );
}
