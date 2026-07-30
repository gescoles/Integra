import { Lock } from "lucide-react";

export function LockedCard({ title, moduleName }: { title: string; moduleName: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
      <Lock className="h-6 w-6 text-slate-300" />
      <h3 className="mt-2 text-sm font-bold text-slate-500">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">
        Módulo de {moduleName} no contratado por tu centro.
      </p>
    </div>
  );
}
