"use client";

import { useState } from "react";
import { Building2, Glasses } from "lucide-react";

export function ReservasTabs({ espacios, gafasVR }: { espacios: React.ReactNode; gafasVR: React.ReactNode }) {
  const [tab, setTab] = useState<"espacios" | "gafas">("espacios");

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm" style={{ width: "fit-content" }}>
        <button
          onClick={() => setTab("espacios")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${tab === "espacios" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
        >
          <Building2 className="h-4 w-4" /> Reserva de espacios
        </button>
        <button
          onClick={() => setTab("gafas")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${tab === "gafas" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
        >
          <Glasses className="h-4 w-4" /> Reserva Gafas RV
        </button>
      </div>

      {tab === "espacios" ? espacios : gafasVR}
    </div>
  );
}
