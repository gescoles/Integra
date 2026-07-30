import { Lock } from "lucide-react";

export function ModuleLocked({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
      <Lock className="h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-500">
        Módulo no contratado
      </h2>
      <p className="mt-1 max-w-sm text-sm text-slate-400">
        Tu centro todavía no tiene contratado el módulo de {moduleName}. Habla
        con tu SuperAdmin para activarlo.
      </p>
    </div>
  );
}
