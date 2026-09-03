import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "./components/Sidebar";
import { ChatWidget } from "./components/ChatWidget";
import { ChatInternoWidget } from "./components/ChatInternoWidget";
import { PushRegistration } from "./components/PushRegistration";
import { NativeBackButton } from "./components/NativeBackButton";
import { SavingOverlay } from "./components/SavingOverlay";
import { GlobalSavingListener } from "./components/GlobalSavingListener";
import { SchoolProvider } from "./SchoolContext";
import { DashboardHeader } from "./components/DashboardHeader";
import { ContenidoPrincipal } from "./components/ContenidoPrincipal";
import { AlertTriangle } from "lucide-react";

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
  let esTicDelCentro = false;
  let esPsicopedagogaDelCentro = false;

  if (session.user.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: { id: true, name: true, modules: true, logoUrl: true, ticUserId: true, psicopedagogaId: true },
    });
    if (school) {
      contractedModules = school.modules;
      schoolInfo = { id: school.id, name: school.name, logoUrl: school.logoUrl };
      esTicDelCentro = school.ticUserId === session.user.id;
      esPsicopedagogaDelCentro = school.psicopedagogaId === session.user.id;
    }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true, locale: true, status: true },
  });

  const cuentaInactiva = currentUser?.status === "INACTIVO";

  return (
    <SchoolProvider
      school={schoolInfo}
      avatarUrl={currentUser?.avatarUrl ?? null}
      locale={currentUser?.locale ?? "ES"}
      chatHabilitado={!cuentaInactiva && contractedModules.includes("comunicacion")}
    >
      <div className={`min-h-screen ${cuentaInactiva ? "bg-slate-200" : "bg-slate-50"}`}>
        <Sidebar
          userName={userName}
          userEmail={session.user.email}
          role={session.user.role}
          esTicDelCentro={!cuentaInactiva && esTicDelCentro}
          esPsicopedagogaDelCentro={!cuentaInactiva && esPsicopedagogaDelCentro}
          contractedModules={cuentaInactiva ? [] : contractedModules}
        />
        <ContenidoPrincipal>
          {cuentaInactiva ? (
            <div>
              <DashboardHeader
                title="Inicio"
                subtitle="Panel de control"
                userName={userName}
                role={session.user.role}
                cuentaInactiva
              />
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center opacity-60 grayscale">
                <AlertTriangle className="h-10 w-10 text-red-400" />
                <p className="text-base font-bold text-[#0B1D4D]">Tu cuenta está inactiva</p>
                <p className="max-w-sm text-sm text-slate-500">
                  No puedes usar ningún módulo mientras tu cuenta esté marcada como inactiva.
                  Ponte en contacto con el administrador de tu centro para que la reactive.
                </p>
              </div>
            </div>
          ) : (
            children
          )}
        </ContenidoPrincipal>
        <ChatWidget userName={userName} />
        {!cuentaInactiva && contractedModules.includes("comunicacion") && <ChatInternoWidget />}
        <PushRegistration />
        <NativeBackButton />
        <SavingOverlay />
        <GlobalSavingListener />
      </div>
    </SchoolProvider>
  );
}
