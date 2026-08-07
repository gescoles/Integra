"use client";

import { useEffect, useId, useState } from "react";

/**
 * Igual que HexLogo, pero cada nodo, línea y diente del engranaje va
 * apareciendo por turnos hasta formar el logo completo — y luego lo repite
 * en bucle mientras dure el guardado, en vez de solo girar.
 */
export function AssemblingLogo({ size = 56 }: { size?: number }) {
  const uid = useId();
  const gradientId = `integraAssemblingGradient-${uid}`;
  const [ciclo, setCiclo] = useState(0);

  const nodes = [
    { x: 31, y: 20 },
    { x: 25.5, y: 10.47 },
    { x: 14.5, y: 10.47 },
    { x: 9, y: 20 },
    { x: 14.5, y: 29.53 },
    { x: 25.5, y: 29.53 },
  ];
  const teethAngles = [0, 60, 120, 180, 240, 300];

  // Cuando termina una vuelta completa de la animación, volvemos a
  // arrancarla desde cero (cambiando la key fuerza a React a re-montar los
  // elementos y relanzar sus animaciones "both").
  useEffect(() => {
    const timer = setTimeout(() => setCiclo((c) => c + 1), 2600);
    return () => clearTimeout(timer);
  }, [ciclo]);

  return (
    <svg key={ciclo} width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FD5249" />
          <stop offset="1" stopColor="#E0453D" />
        </linearGradient>
      </defs>

      {/* Líneas: se van "dibujando" una a una hacia cada nodo */}
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
          className="integra-assembling-line"
          style={{ animationDelay: `${0.25 + i * 0.09}s` }}
        />
      ))}

      {/* Dientes del engranaje, aparecen después de las líneas */}
      {teethAngles.map((angle, i) => (
        <rect
          key={`tooth-${angle}`}
          x="18.7"
          y="12.2"
          width="2.6"
          height="3.4"
          rx="0.7"
          fill={`url(#${gradientId})`}
          transform={`rotate(${angle} 20 20)`}
          className="integra-assembling-tooth"
          style={{ animationDelay: `${0.9 + i * 0.06}s` }}
        />
      ))}

      {/* Núcleo central, aparece el primero y luego late suavemente */}
      <circle cx="20" cy="20" r="6" fill={`url(#${gradientId})`} className="integra-assembling-hub" />
      <circle cx="20" cy="20" r="1.7" fill="white" />

      {/* Nodos exteriores: los últimos en aparecer, "cerrando" el logo */}
      {nodes.map((n, i) => (
        <circle
          key={`node-${i}`}
          cx={n.x}
          cy={n.y}
          r="2.5"
          fill={`url(#${gradientId})`}
          className="integra-assembling-node"
          style={{ animationDelay: `${1.2 + i * 0.08}s` }}
        />
      ))}
    </svg>
  );
}
