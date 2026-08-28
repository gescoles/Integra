import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../../components/DashboardHeader";
import { GuardiasTabs } from "../GuardiasTabs";
import { AbsentismoClient } from "./AbsentismoClient";

function horasEntre(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  const minutos = hf * 60 + mf - (hi * 60 + mi);
  return Math.max(0, minutos) / 60;
}

export default async function AbsentismoPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  const schoolId = session?.user.schoolId;
  const userName = session?.user.name || session?.user.email?.split("@")[0] || "Usuario";

  const esDirectivo = role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
  if (!esDirectivo || !schoolId) redirect("/dashboard/guardias");

  // Contamos como "falta real" cualquier aviso que no haya sido rechazado
  // (pendiente, aceptado o ya asignado) — un aviso rechazado no cuenta como
  // ausencia real, ya que dirección determinó que no procedía.
  const coberturas = await prisma.coberturaGuardia.findMany({
    where: { schoolId, estado: { not: "RECHAZADA" } },
    select: {
      profesorAusenteId: true,
      fecha: true,
      horaInicio: true,
      horaFin: true,
      profesorAusente: { select: { id: true, name: true, email: true } },
    },
  });

  const porProfesor = new Map<
    string,
    { id: string; nombre: string; veces: number; dias: Set<string>; horas: number }
  >();

  for (const c of coberturas) {
    const key = c.profesorAusenteId;
    if (!porProfesor.has(key)) {
      porProfesor.set(key, {
        id: key,
        nombre: c.profesorAusente.name ?? c.profesorAusente.email,
        veces: 0,
        dias: new Set(),
        horas: 0,
      });
    }
    const entry = porProfesor.get(key)!;
    entry.veces += 1;
    entry.dias.add(c.fecha.toISOString().slice(0, 10));
    entry.horas += horasEntre(c.horaInicio, c.horaFin);
  }

  const filas = Array.from(porProfesor.values())
    .map((p) => ({ id: p.id, nombre: p.nombre, veces: p.veces, dias: p.dias.size, horas: Math.round(p.horas * 10) / 10 }))
    .sort((a, b) => b.veces - a.veces);

  return (
    <div>
      <DashboardHeader
        title="Absentismo"
        subtitle="Cuántas veces, días y horas ha faltado cada profesor/a"
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <Suspense fallback={null}>
        <GuardiasTabs />
      </Suspense>
      <AbsentismoClient filas={filas} />
    </div>
  );
}
