import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SuperAdminHome } from "./SuperAdminHome";
import { CoordinadorHome } from "./CoordinadorHome";
import { ProfesorHome } from "./ProfesorHome";
import { DashboardHeader } from "./components/DashboardHeader";
import { translate } from "./i18n";

export default async function DashboardHomePage() {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "SUPERADMIN";
  const schoolId = session?.user.schoolId ?? null;
  const locale = session?.user.locale ?? "ES";

  if (role === "SUPERADMIN") {
    return <SuperAdminHome userName={userName} role={role} locale={locale} />;
  }

  if (role === "COORDINADOR" || role === "ADMIN_CENTRO") {
    return (
      <CoordinadorHome
        userId={session?.user.id ?? ""}
        userName={userName}
        role={role}
        schoolId={schoolId}
        locale={locale}
      />
    );
  }

  if (role === "PROFESOR" && session?.user.id) {
    return (
      <ProfesorHome
        userId={session.user.id}
        userName={userName}
        role={role}
        schoolId={schoolId}
        locale={locale}
      />
    );
  }

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "home.panelGeneral")}
        subtitle={`${translate(locale, "home.saludo")}, ${userName}.`}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
        {translate(locale, "home.enConstruccion")}
      </div>
    </div>
  );
}
