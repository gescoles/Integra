"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

export function TabsModuls({ modulsPrimer, modulsSegon }: { modulsPrimer: string[]; modulsSegon: string[] }) {
  const [curs, setCurs] = useState<1 | 2>(1);
  const moduls = curs === 1 ? modulsPrimer : modulsSegon;

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => setCurs(1)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            curs === 1 ? "bg-[#FD5249] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          1r curs
        </button>
        <button
          onClick={() => setCurs(2)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            curs === 2 ? "bg-[#FD5249] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          2n curs
        </button>
      </div>

      <div key={curs} className="mt-5 grid animate-[fadeSlide_0.3s_ease-out] grid-cols-1 gap-2.5 sm:grid-cols-2">
        {moduls.map((m) => (
          <div key={m} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
            <BookOpen className="h-4 w-4 shrink-0 text-[#FD5249]" />
            <span className="text-sm text-slate-700">{m}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
