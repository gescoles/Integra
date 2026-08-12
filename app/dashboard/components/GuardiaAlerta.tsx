import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function GuardiaAlerta({ mensaje }: { mensaje: string }) {
  return (
    <Link
      href="/dashboard/guardias"
      className="animate-guardia-pulse mb-5 flex items-center justify-between rounded-xl border border-[#FD5249]/40 bg-red-50 px-4 py-3 hover:bg-red-100"
    >
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 text-[#FD5249]" />
        <span className="text-sm font-semibold text-[#B3251D]">{mensaje}</span>
      </div>
      <span className="text-xs font-semibold text-[#FD5249] underline">Ir a Guardias</span>

      <style>{`
        @keyframes guardia-pulse-soft {
          0%, 100% { box-shadow: 0 0 0 0 rgba(253, 82, 73, 0.25); }
          50% { box-shadow: 0 0 0 6px rgba(253, 82, 73, 0); }
        }
        .animate-guardia-pulse {
          animation: guardia-pulse-soft 2.6s ease-in-out infinite;
        }
      `}</style>
    </Link>
  );
}
