import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
          locale: user.locale,
        };
      },
    }),
  ],
  callbacks: {
    // IMPORTANTE: con estrategia "jwt" el token vive en una cookie y, si solo
    // copiáramos role/schoolId aquí en el login (cuando `user` existe), esos
    // valores quedarían "congelados" en la sesión hasta que el usuario
    // cerrara sesión y volviera a entrar. Si un SuperAdmin reasigna a alguien
    // de centro (o le cambia el rol) mientras esa persona sigue con la
    // sesión abierta, todo lo que cree a partir de ahí (tutorías, alumnos,
    // material...) se guardaría con el centro/rol VIEJO sin que nadie lo note.
    // Por eso releemos el usuario en cada petición y mantenemos el token
    // siempre sincronizado con la base de datos.
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.locale = user.locale;
        token.userId = user.id;
        return token;
      }

      const userId = token.userId ?? token.sub;
      if (userId) {
        const fresh = await prisma.user.findUnique({
          where: { id: userId as string },
          select: { role: true, schoolId: true, locale: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.schoolId = fresh.schoolId;
          token.locale = fresh.locale;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
        session.user.locale = token.locale;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
