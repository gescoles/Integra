export function ButtonSpinner({ light = true }: { light?: boolean }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${
        light ? "border-white/40 border-t-white" : "border-slate-300 border-t-[#2F6FED]"
      }`}
    />
  );
}
