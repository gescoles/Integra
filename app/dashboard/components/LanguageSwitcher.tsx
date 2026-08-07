"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronUp } from "lucide-react";
import { useLocale } from "../SchoolContext";
import { LOCALE_LABELS, AppLocale, translate } from "../i18n";
import { LocaleFlag } from "./Flags";

const OPTIONS: AppLocale[] = ["CA", "ES", "EN"];

export function LanguageSwitcher({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = variant === "dark";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(opt: AppLocale) {
    setLocale(opt);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative mb-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
          isDark
            ? "border-white/10 bg-white/5 hover:bg-white/10"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
      >
        <span className="flex h-4 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10">
          <LocaleFlag locale={locale} />
        </span>
        <span className={`text-[11px] font-semibold ${isDark ? "text-white" : "text-[#0B1D4D]"}`}>
          {LOCALE_LABELS[locale]}
        </span>
        <ChevronUp
          className={`ml-auto h-3 w-3 shrink-0 transition-transform ${open ? "" : "rotate-180"} ${
            isDark ? "text-slate-400" : "text-slate-400"
          }`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-1.5 w-full min-w-[170px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
          <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {translate(locale, "sidebar.idioma")}
          </div>
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                opt === locale ? "bg-blue-50/60 font-semibold text-[#FD5249]" : "text-slate-600"
              }`}
            >
              <span className="flex h-4 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10">
                <LocaleFlag locale={opt} />
              </span>
              <span className="flex-1">{LOCALE_LABELS[opt]}</span>
              {opt === locale && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
