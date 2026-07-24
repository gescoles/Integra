"use client";

import { useId } from "react";

export function HexLogo({ size = 36 }: { size?: number }) {
  const uid = useId();
  const gradientId = `integraLogoGradient-${uid}`;

  // Nodes pulled in closer to the hub (radius 11 instead of 15) so the icon
  // reads as one compact mark instead of a hub + a separate outer ring.
  const nodes = [
    { x: 31, y: 20 },
    { x: 25.5, y: 10.47 },
    { x: 14.5, y: 10.47 },
    { x: 9, y: 20 },
    { x: 14.5, y: 29.53 },
    { x: 25.5, y: 29.53 },
  ];
  const teethAngles = [0, 60, 120, 180, 240, 300];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* Short spokes from hub to each node */}
      {nodes.map((n, i) => (
        <line
          key={`line-${i}`}
          x1="20"
          y1="20"
          x2={n.x}
          y2={n.y}
          stroke={`url(#${gradientId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ))}

      {/* Gear teeth, sitting right against the hub edge */}
      {teethAngles.map((angle) => (
        <rect
          key={`tooth-${angle}`}
          x="18.7"
          y="12.2"
          width="2.6"
          height="3.4"
          rx="0.7"
          fill={`url(#${gradientId})`}
          transform={`rotate(${angle} 20 20)`}
        />
      ))}

      {/* Solid hub on top, covers the inner ends of the spokes */}
      <circle cx="20" cy="20" r="6" fill={`url(#${gradientId})`} />
      <circle cx="20" cy="20" r="1.7" fill="white" />

      {/* Outer nodes, drawn last so they sit cleanly on top of the spokes */}
      {nodes.map((n, i) => (
        <circle
          key={`node-${i}`}
          cx={n.x}
          cy={n.y}
          r="2.5"
          fill={`url(#${gradientId})`}
        />
      ))}
    </svg>
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
