import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { ChatbotAdminClient } from "./ChatbotAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChatbotAdminPage() {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "SuperAdmin";

  if (session?.user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const [entradas, preguntasSinResponder] = await Promise.all([
    prisma.chatbotEntry.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.chatbotPreguntaSinResponder.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "chatbotAdmin.title")}
        subtitle={translate(locale, "chatbotAdmin.subtitle")}
        userName={userName}
        role="SUPERADMIN"
      />
      <ChatbotAdminClient
        entradas={entradas.map((e) => ({
          id: e.id,
          pregunta: e.pregunta,
          palabrasClave: e.palabrasClave,
          respuesta: e.respuesta,
        }))}
        preguntasSinResponder={preguntasSinResponder.map((p) => ({
          id: p.id,
          texto: p.texto,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
