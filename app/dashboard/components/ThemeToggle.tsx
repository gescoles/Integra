"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("integra-theme");
    const prefersDark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("integra-theme", next ? "dark" : "light");
  }

  if (!mounted) {
    return <div className="h-[42px] w-[42px]" />;
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? "Cambiar a modo día" : "Cambiar a modo noche"}
      className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
