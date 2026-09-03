import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { alertarSuperAdminsBloqueo } from "./alertaSeguridad";

// Registra el intento fallido y, justo en el momento en que este intento
// concreto hace que se llegue a 5 en los últimos 15 minutos (ni antes ni
// en los siguientes, para no mandar un aviso por cada intento mientras
// ya está bloqueado), avisa a todos los SuperAdmin por correo y con una
// notificación dentro de la app.
async function registrarIntentoFallido(email: string) {
  await prisma.intentoLoginFallido.create({ data: { email } });

  const haceQuinceMinutos = new Date(Date.now() - 15 * 60 * 1000);
  const totalAhora = await prisma.intentoLoginFallido.count({
    where: { email, createdAt: { gte: haceQuinceMinutos } },
  });

  if (totalAhora === 5) {
    // No se espera a que termine — si el envío del correo tardara, no
    // queremos que el login del que ha fallado se quede colgado por eso.
    alertarSuperAdminsBloqueo(email).catch((e) => console.error("Error alertando del bloqueo:", e));
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Sesión caduca sola tras 8 horas de inactividad (una jornada de
    // trabajo) — si sigue habiendo actividad, se renueva sola cada vez
    // que se toca (updateAge), así que un uso normal nunca se corta.
    maxAge: 8 * 60 * 60,
    updateAge: 15 * 60,
  },
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

        const emailLimpio = credentials.email.toLowerCase();

        // Protección contra fuerza bruta: 5 intentos fallidos en 15
        // minutos bloquean ese email temporalmente, sin importar si la
        // siguiente contraseña que prueben es la correcta.
        const haceQuinceMinutos = new Date(Date.now() - 15 * 60 * 1000);
        const intentosRecientes = await prisma.intentoLoginFallido.count({
          where: { email: emailLimpio, createdAt: { gte: haceQuinceMinutos } },
        });
        if (intentosRecientes >= 5) {
          throw new Error("DEMASIADOS_INTENTOS");
        }

        const user = await prisma.user.findUnique({
          where: { email: emailLimpio },
          include: { school: { select: { status: true } } },
        });

        if (!user) {
          await registrarIntentoFallido(emailLimpio);
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          await registrarIntentoFallido(emailLimpio);
          return null;
        }

        // No dejamos entrar ni siquiera la primera vez si el SuperAdmin
        // ha desactivado la cuenta — antes solo se cortaba al refrescar
        // el token, pero eso no bloqueaba el primer login.
        if (user.status !== "ACTIVO") {
          return null;
        }

        // Ni tampoco si el centro al que pertenece está archivado — un
        // centro archivado deja a todos sus usuarios sin acceso hasta que
        // se desarchive (los SuperAdmin no tienen centro, así que no les
        // afecta esta comprobación).
        if (user.school?.status === "ARCHIVADO") {
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
        const existe = await prisma.user.findUnique({
          where: { email },
          include: { school: { select: { status: true } } },
        });
        const autorizado = Boolean(
          existe && existe.status === "ACTIVO" && existe.school?.status !== "ARCHIVADO"
        );
        // Un intento de entrar por Teams con un correo que no existe en
        // Docentium (o que está desactivado) cuenta como intento fallido
        // igual que una contraseña incorrecta — mismo contador, mismo
        // bloqueo a los 5, mismo aviso al SuperAdmin.
        if (!autorizado) {
          await registrarIntentoFallido(email);
        }
        return autorizado;
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
            select: {
              role: true,
              schoolId: true,
              locale: true,
              status: true,
              school: { select: { status: true } },
            },
          });
          // Revocación inmediata: si un SuperAdmin desactiva a alguien (o
          // archiva su centro) mientras tiene la sesión abierta, se le
          // corta el acceso en cuanto se refresca el token (como mucho, un
          // minuto después), sin tener que esperar a que caduque la sesión.
          if (!fresh || fresh.status !== "ACTIVO" || fresh.school?.status === "ARCHIVADO") {
            throw new Error("CUENTA_DESACTIVADA");
          }
          token.role = fresh.role;
          token.schoolId = fresh.schoolId;
          token.locale = fresh.locale;
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
  events: {
    // Se dispara justo después de un login correcto, ya aprobado por
    // authorize()/signIn — el sitio limpio para dejar constancia de
    // "quién ha entrado y cuándo", sin mezclarlo con la lógica que
    // decide si se le deja entrar o no.
    async signIn({ user, account }) {
      if (!user?.email) return;
      try {
        // Con Microsoft, el "user.id" que llega aquí es el id de Azure AD,
        // no el nuestro — hay que buscar el usuario real de Docentium por
        // su email para guardar el id correcto (si no, rompería la
        // relación con la tabla User).
        let userIdReal: string | null = user.id ?? null;
        if (account?.provider === "azure-ad") {
          const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { id: true } });
          userIdReal = dbUser?.id ?? null;
        }
        await prisma.registroAcceso.create({
          data: {
            userId: userIdReal,
            email: user.email.toLowerCase(),
            nombre: user.name ?? user.email,
            metodo: account?.provider === "azure-ad" ? "microsoft" : "password",
          },
        });
      } catch (e) {
        console.error("No se pudo registrar el acceso:", e);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
