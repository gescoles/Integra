"use client";

const AULAS = Array.from({ length: 56 }, (_, i) => `E${i}`);

export function AulaSelect({
  name = "aula",
  defaultValue = "",
  required = true,
  className,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue}
      className={
        className ?? "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
      }
    >
      <option value="" disabled>
        Selecciona...
      </option>
      {/* Si el valor actual ya no está en la lista (aula antigua o
          renombrada), la dejamos igual como opción para no perder el
          dato existente. */}
      {defaultValue && !AULAS.includes(defaultValue) && <option value={defaultValue}>{defaultValue}</option>}
      {AULAS.map((aula) => (
        <option key={aula} value={aula}>
          {aula}
        </option>
      ))}
    </select>
  );
}
