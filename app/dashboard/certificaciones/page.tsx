import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { ModuleLocked } from "../components/ModuleLocked";
import { CertificacionesClient } from "./CertificacionesClient";
import { obtenerCertificaciones, obtenerProfesoresConCertificaciones, obtenerCatalogoCompletoPublico, obtenerDepartamentosCatalogo } from "./actions";
import { obtenerCategoriasDisponibles } from "../superadmin/certificaciones-catalogo/actions";
import { obtenerMisAsignacionesPendientes, obtenerProfesoresDelCentro, obtenerTodasLasAsignaciones } from "./asignaciones";

export const dynamic = "force-dynamic";

export default async function CertificacionesPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "PROFESOR";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const userId = session?.user.id ?? null;
  const schoolId = session?.user.schoolId ?? null;
  const esDirectivo = role === "SUPERADMIN" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader title="Certificaciones" subtitle="Consulta toda la información sobre las certificaciones disponibles para tu centro." userName={userName} role={role} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          No perteneces a ningún centro todavía.
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true, cursoAcademico: true, grupos: true } });
  if (!school?.modules.includes("certificaciones")) {
    return (
      <div>
        <DashboardHeader title="Certificaciones" subtitle="Consulta toda la información sobre las certificaciones disponibles para tu centro." userName={userName} role={role} />
        <ModuleLocked moduleName="Certificaciones" />
      </div>
    );
  }

  const [certificaciones, profesores, catalogo, categorias, departamentos, misAsignacionesPendientes, profesoresCentro, todasLasAsignaciones] = await Promise.all([
    obtenerCertificaciones(),
    esDirectivo ? obtenerProfesoresConCertificaciones() : Promise.resolve([]),
    obtenerCatalogoCompletoPublico(),
    obtenerCategoriasDisponibles(),
    obtenerDepartamentosCatalogo(),
    obtenerMisAsignacionesPendientes(),
    esDirectivo ? obtenerProfesoresDelCentro() : Promise.resolve([]),
    esDirectivo ? obtenerTodasLasAsignaciones() : Promise.resolve([]),
  ]);

  return (
    <div>
      <DashboardHeader title="Consulta de certificaciones" subtitle="Consulta toda la información sobre las certificaciones disponibles para tu centro." userName={userName} role={role} />
      <CertificacionesClient
        certificaciones={certificaciones}
        catalogo={catalogo}
        categorias={categorias}
        departamentos={departamentos}
        cursoAcademicoCentro={school.cursoAcademico}
        gruposCentro={school.grupos}
        profesores={profesores}
        esDirectivo={esDirectivo}
        esSuperAdmin={role === "SUPERADMIN"}
        userId={userId}
        misAsignacionesPendientes={misAsignacionesPendientes}
        profesoresCentro={profesoresCentro}
        todasLasAsignaciones={todasLasAsignaciones}
        schoolId={schoolId}
      />
    </div>
  );
}
