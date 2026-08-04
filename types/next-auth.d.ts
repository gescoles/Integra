import { Role, Locale } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    schoolId: string | null;
    locale: Locale;
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
  }
}
