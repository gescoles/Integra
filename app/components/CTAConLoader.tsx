"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AssemblingLogo } from "../dashboard/components/AssemblingLogo";

export function CTAConLoader({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  function handleClick() {
    setCargando(true);
    // Deja ver la animación un momento antes de navegar, si no la
    // transición es tan rápida que no llega a apreciarse.
    setTimeout(() => router.push(href), 650);
  }

  return (
    <>
      {cargando && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <AssemblingLogo size={140} />
            <div className="flex items-center gap-1 text-sm font-semibold text-[#0B1D4D]">
              <span>Un momento</span>
              <span className="flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D] [animation-delay:-0.3s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D] [animation-delay:-0.15s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D]" />
              </span>
            </div>
          </div>
        </div>
      )}
      <button type="button" onClick={handleClick} className={className}>
        {children}
      </button>
    </>
  );
}
