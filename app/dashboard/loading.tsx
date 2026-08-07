export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#FD5249]" />
      </div>
      <p className="text-sm font-medium text-slate-400">Cargando…</p>
    </div>
  );
}
