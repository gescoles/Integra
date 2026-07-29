import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "./components/Sidebar";

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar userName={userName} role={session.user.role} />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
