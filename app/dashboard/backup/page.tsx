import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { BackupClient } from "./BackupClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BackupPage() {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email?.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "PROFESOR";

  if (role !== "SUPERADMIN") {
    return (
      <div>
        <DashboardHeader title={translate(locale, "nav.backup")} userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "backup.soloSuperAdmin")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "nav.backup")}
        subtitle={translate(locale, "backup.subtitle")}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <BackupClient />
    </div>
  );
}
