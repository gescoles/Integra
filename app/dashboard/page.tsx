import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SuperAdminHome } from "./SuperAdminHome";
import { CoordinadorHome } from "./CoordinadorHome";
import { ProfesorHome } from "./ProfesorHome";
import { DashboardHeader } from "./components/DashboardHeader";

export default async function DashboardHomePage() {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "SUPERADMIN";
  const schoolId = session?.user.schoolId ?? null;

  if (role === "SUPERADMIN") {
    return <SuperAdminHome userName={userName} role={role} />;
  }

  if (role === "COORDINADOR" || role === "ADMIN_CENTRO") {
    return <CoordinadorHome userName={userName} role={role} schoolId={schoolId} />;
  }

  if (role === "PROFESOR" && session?.user.id) {
    return (
      <ProfesorHome
        userId={session.user.id}
        userName={userName}
        role={role}
        schoolId={schoolId}
      />
    );
  }

  return (
    <div>
      <DashboardHeader
        title="Panel general"
        subtitle={`Bienvenido, ${userName}.`}
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
        Tu panel está en construcción.
      </div>
    </div>
  );
}
