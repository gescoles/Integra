import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "./components/Sidebar";
import { ChatWidget } from "./components/ChatWidget";
import { SavingOverlay } from "./components/SavingOverlay";
import { SchoolProvider } from "./SchoolContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userName = session.user.name || session.user.email.split("@")[0];

  // Módulos y datos del centro del usuario, siempre en vivo (no se guardan
  // por usuario, así que si el centro mejora de plan o cambia de foto, se
  // refleja al instante para todos sus usuarios).
  let contractedModules: string[] = [];
  let schoolInfo: { id: string; name: string; logoUrl: string | null } | null = null;

  if (session.user.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: { id: true, name: true, modules: true, logoUrl: true },
    });
    if (school) {
      contractedModules = school.modules;
      schoolInfo = { id: school.id, name: school.name, logoUrl: school.logoUrl };
    }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true, locale: true },
  });

  return (
    <SchoolProvider
      school={schoolInfo}
      avatarUrl={currentUser?.avatarUrl ?? null}
      locale={currentUser?.locale ?? "ES"}
    >
      <div className="min-h-screen bg-slate-50">
        <Sidebar
          userName={userName}
          role={session.user.role}
          contractedModules={contractedModules}
        />
        <div className="lg:pl-64">
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{children}</div>
        </div>
        <ChatWidget userName={userName} />
        <SavingOverlay />
      </div>
    </SchoolProvider>
  );
}
