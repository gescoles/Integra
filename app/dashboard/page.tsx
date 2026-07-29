import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#0B1D4D]">
          ¡Sesión iniciada correctamente!
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Bienvenido, <strong>{session.user.email}</strong>
        </p>
        <p className="mt-1 text-xs text-slate-400">Rol: {session.user.role}</p>
        <p className="mt-6 text-xs text-slate-400">
          Esto es un placeholder — el dashboard real de gestión del centro se
          construirá en la siguiente fase.
        </p>
      </div>
    </main>
  );
}
