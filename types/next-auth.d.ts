import { Role, Locale } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    schoolId: string | null;
    locale: Locale;
    // Solo se rellena en el login por credenciales, a partir del
    // checkbox "Recordarme" — decide si la sesión dura semanas (30 días)
    // o se corta a las 8h aunque el navegador siga abierto.
    rememberMe?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      schoolId: string | null;
      locale: Locale;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    schoolId: string | null;
    locale: Locale;
    userId?: string;
    ultimaComprobacion?: number;
    rememberMe?: boolean;
    loginTimestamp?: number;
  }
}
