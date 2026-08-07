import Link from "next/link";
import { Landmark } from "lucide-react";
import { translate, AppLocale } from "../i18n";

type SchoolOption = { id: string; name: string; logoUrl?: string | null };

function SchoolLogo({ school, size = "lg" }: { school: SchoolOption; size?: "lg" | "sm" }) {
  const dims = size === "lg" ? "h-20 w-20" : "h-9 w-9";
  const iconDims = size === "lg" ? "h-9 w-9" : "h-4 w-4";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ${dims}`}
    >
      {school.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
      ) : (
        <Landmark className={`${iconDims} text-slate-300`} />
      )}
    </div>
  );
}

export function SchoolPicker({
  schools,
  basePath,
  locale = "ES",
}: {
  schools: SchoolOption[];
  basePath: string;
  locale?: AppLocale;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Landmark className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <h3 className="mb-1 text-sm font-bold text-[#0B1D4D]">
        {translate(locale, "schoolPicker.title")}
      </h3>
      <p className="mb-6 text-xs text-slate-400">
        {translate(locale, "schoolPicker.subtitle")}
      </p>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {schools.map((s) => (
          <Link
            key={s.id}
            href={`${basePath}?school=${s.id}`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-[#FD5249] hover:shadow-md"
          >
            <SchoolLogo school={s} size="lg" />
            <span className="text-sm font-semibold text-slate-700 group-hover:text-[#FD5249]">
              {s.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Barra compacta para cambiar de centro sin perder la página en la que estás
export function SchoolSwitcher({
  schools,
  currentSchoolId,
  basePath,
  locale = "ES",
}: {
  schools: SchoolOption[];
  currentSchoolId: string;
  basePath: string;
  locale?: AppLocale;
}) {
  return (
    <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Landmark className="h-4 w-4 text-[#FD5249]" />
        <span className="text-xs font-semibold text-slate-500">
          {translate(locale, "schoolSwitcher.label")}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {schools.map((s) => (
          <Link
            key={s.id}
            href={`${basePath}?school=${s.id}`}
            className={`flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-3 text-xs font-semibold transition-colors ${
              s.id === currentSchoolId
                ? "bg-[#FD5249] text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <SchoolLogo school={s} size="sm" />
            {s.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
