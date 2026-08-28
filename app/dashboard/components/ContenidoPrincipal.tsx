"use client";

import { useSidebarColapsado } from "../SchoolContext";

export function ContenidoPrincipal({ children }: { children: React.ReactNode }) {
  const { colapsado } = useSidebarColapsado();

  return (
    <div className={`pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] transition-[padding] duration-200 ${colapsado ? "" : "lg:pl-64"}`}>
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{children}</div>
    </div>
  );
}
