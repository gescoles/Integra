"use client";

import { useSavingOverlay, useLocale } from "../SchoolContext";
import { AssemblingLogo } from "./AssemblingLogo";
import { translate } from "../i18n";

export function SavingOverlay() {
  const { guardando } = useSavingOverlay();
  const { locale } = useLocale();

  if (!guardando) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <AssemblingLogo size={56} />
        <div className="flex items-center gap-1 text-sm font-semibold text-[#0B1D4D]">
          <span>{translate(locale, "common.guardando")}</span>
          <span className="flex gap-0.5">
            <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D] [animation-delay:-0.3s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D] [animation-delay:-0.15s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D]" />
          </span>
        </div>
      </div>
    </div>
  );
}
