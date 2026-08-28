import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
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
    // Inicio de sesión con la cuenta de Microsoft/Teams del usuario. No
    // crea cuentas nuevas por su cuenta — solo deja entrar a alguien si ya
    // existe un usuario en Docentium con ese mismo email (comprobado en el
    // callback signIn, más abajo). Se activa solo si están puestas las 3
    // variables de entorno; si faltan, este proveedor simplemente no
    // aparece, sin romper nada.
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID,
            // Sin esto, si el navegador ya tiene una sesión de Microsoft
            // abierta (por ejemplo, con Outlook o Teams en otra pestaña),
            // entra directo con esa cuenta sin dejar elegir cuál usar.
            authorization: { params: { prompt: "select_account" } },
          }),
        ]
      : []),
  ],
  callbacks: {
    // Con el proveedor de Microsoft, solo dejamos entrar a quien ya exista
    // como usuario en Docentium con ese email — nunca se crea una cuenta
    // nueva solo por iniciar sesión con Teams. Las cuentas se siguen
    // creando desde "Usuarios", como hasta ahora.
    async signIn({ account, profile }) {
      if (account?.provider === "azure-ad") {
        const email = profile?.email?.toLowerCase();
        if (!email) return false;
        const existe = await prisma.user.findUnique({ where: { email } });
        return Boolean(existe);
      }
      return true;
    },
    // IMPORTANTE: con estrategia "jwt" el token vive en una cookie y, si solo
    // copiáramos role/schoolId aquí en el login (cuando `user` existe), esos
    // valores quedarían "congelados" en la sesión hasta que el usuario
    // cerrara sesión y volviera a entrar. Si un SuperAdmin reasigna a alguien
    // de centro (o le cambia el rol) mientras esa persona sigue con la
    // sesión abierta, todo lo que cree a partir de ahí (tutorías, alumnos,
    // material...) se guardaría con el centro/rol VIEJO sin que nadie lo note.
    // Por eso releemos el usuario en cada petición y mantenemos el token
    // siempre sincronizado con la base de datos.
    async jwt({ token, user, account }) {
      // Login por Microsoft: el "user" que da Azure AD no trae nuestros
      // campos (role, schoolId...) — hay que ir a buscar el usuario real de
      // Docentium por su email para poder rellenar el token.
      if (account?.provider === "azure-ad" && user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (dbUser) {
          token.role = dbUser.role;
          token.schoolId = dbUser.schoolId;
          token.locale = dbUser.locale;
          token.userId = dbUser.id;
          token.sub = dbUser.id;
        }
        return token;
      }

      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.locale = user.locale;
        token.userId = user.id;
        return token;
      }

      const userId = token.userId ?? token.sub;
      if (userId) {
        // No hace falta ir a la base de datos en CADA petición — con el
        // panel usando sondeo (chat, notificaciones...) esto se dispara
        // decenas de veces por minuto y agota el pool de conexiones.
        // Basta con refrescar el rol/centro cada minuto: si un SuperAdmin
        // cambia algo, tarda como mucho ese minuto en notarse, y a cambio
        // no saturamos la base de datos en cada sondeo.
        const ultimaVez = (token.ultimaComprobacion as number | undefined) ?? 0;
        const haPasadoUnMinuto = Date.now() - ultimaVez > 60_000;

        if (haPasadoUnMinuto) {
          const fresh = await prisma.user.findUnique({
            where: { id: userId as string },
            select: { role: true, schoolId: true, locale: true },
          });
          if (fresh) {
            token.role = fresh.role;
            token.schoolId = fresh.schoolId;
            token.locale = fresh.locale;
          }
          token.ultimaComprobacion = Date.now();
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? (token.sub as string);
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
        session.user.locale = token.locale;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
