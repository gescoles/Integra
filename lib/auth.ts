import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { alertarSuperAdminsBloqueo } from "./alertaSeguridad";
import { obtenerIp, obtenerUbicacion, parseDispositivo } from "./deviceInfo";
import { sendNuevoDispositivoEmail } from "./email";

const OCHO_HORAS_MS = 8 * 60 * 60 * 1000;
const TREINTA_DIAS_S = 30 * 24 * 60 * 60;

// Guarda el acceso y, si este dispositivo no se le había visto nunca antes
// a este usuario (y no es su primerísimo login, donde no hay nada con qué
// comparar todavía), le avisa por correo por si no ha sido él.
async function registrarAccesoYAvisarSiEsNuevo(params: {
  userId: string;
  email: string;
  nombre: string;
  metodo: string;
  ip: string | null;
  dispositivo: string;
  ubicacion: string | null;
}) {
  try {
    const accesosPrevios = await prisma.registroAcceso.count({ where: { userId: params.userId } });

    if (accesosPrevios > 0) {
      const dispositivoConocido = await prisma.registroAcceso.findFirst({
        where: { userId: params.userId, dispositivo: params.dispositivo },
        select: { id: true },
      });

      if (!dispositivoConocido) {
        // No se espera a que termine el envío — un correo lento no debe
        // retrasar ni un segundo el login de quien sí es el dueño real.
        sendNuevoDispositivoEmail({
          to: params.email,
          nombre: params.nombre,
          dispositivo: params.dispositivo,
          ubicacion: params.ubicacion,
          fecha: new Date(),
        }).catch((e) => console.error("No se pudo enviar el aviso de dispositivo nuevo:", e));
      }
    }

    await prisma.registroAcceso.create({
      data: {
        userId: params.userId,
        email: params.email,
        nombre: params.nombre,
        metodo: params.metodo,
        ip: params.ip,
        dispositivo: params.dispositivo,
        ubicacion: params.ubicacion,
      },
    });
  } catch (e) {
    console.error("No se pudo registrar el acceso / comprobar dispositivo nuevo:", e);
  }
}

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
    // Techo máximo de la cookie/token: 30 días, pensado para quien marca
    // "Recordarme" en el login. Quien lo desmarca se corta antes igualmente
    // (a las 8h, ver el callback jwt más abajo) aunque el token técnicamente
    // pudiera durar hasta este límite. Con actividad, se renueva solo cada
    // vez que se toca (updateAge), así que un uso normal nunca se corta.
    maxAge: TREINTA_DIAS_S,
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
        // Campo invisible (nuestro propio formulario de login no usa la
        // pantalla que genera NextAuth) — viaja el valor del checkbox
        // "Recordarme" para decidir cuánto dura la sesión.
        remember: { label: "Recordarme", type: "text" },
      },
      async authorize(credentials, req) {
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

        // No se espera aquí: el registro/aviso puede tardar un poco (una
        // consulta más, y a veces un correo) y no debe retrasar el login,
        // que ya se ha decidido que es correcto en este punto.
        registrarAccesoYAvisarSiEsNuevo({
          userId: user.id,
          email: user.email,
          nombre: user.name ?? user.email,
          metodo: "password",
          ip: obtenerIp(req?.headers),
          dispositivo: parseDispositivo(req?.headers?.["user-agent"]),
          ubicacion: obtenerUbicacion(req?.headers),
        }).catch((e) => console.error("Error registrando el acceso:", e));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
          locale: user.locale,
          rememberMe: credentials.remember !== "false",
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
        // El login con Microsoft no tiene checkbox de "Recordarme" propio
        // (ya depende de la sesión de Microsoft/Teams del navegador) — se
        // trata siempre como recordado, sin el tope extra de 8h de abajo.
        token.rememberMe = true;
        token.loginTimestamp = Date.now();
        return token;
      }

      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.locale = user.locale;
        token.userId = user.id;
        token.rememberMe = user.rememberMe ?? true;
        token.loginTimestamp = Date.now();
        return token;
      }

      // Quien ha desmarcado "Recordarme" se queda fuera a las 8h en punto
      // desde que entró, sin importar que siga con la pestaña abierta y
      // "tocando" la app (a diferencia del resto, que se renueva solo con
      // la actividad) — es justo la diferencia que pide ese checkbox.
      // Comprobación en memoria, sin ir a la base de datos: se hace en
      // cada petición, no solo una vez por minuto.
      if (token.rememberMe === false && token.loginTimestamp && Date.now() - token.loginTimestamp > OCHO_HORAS_MS) {
        throw new Error("SESION_EXPIRADA");
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
          // Si la consulta en sí falla (por ejemplo, la conexión a la base
          // de datos tarda en "despertar" tras un rato inactiva — típico
          // al reabrir la app móvil después de un rato cerrada), NO se
          // cierra la sesión: eso sería castigar un fallo puntual de red
          // como si la cuenta se hubiera desactivado de verdad. Se
          // reintenta en la siguiente petición (no se actualiza
          // ultimaComprobacion), y el token se queda con los datos que ya
          // tenía mientras tanto.
          const buscarUsuarioFresco = () =>
            prisma.user.findUnique({
              where: { id: userId as string },
              select: {
                role: true,
                schoolId: true,
                locale: true,
                status: true,
                school: { select: { status: true } },
              },
            });
          let fresh: Awaited<ReturnType<typeof buscarUsuarioFresco>>;
          try {
            fresh = await buscarUsuarioFresco();
          } catch (e) {
            console.error("No se pudo refrescar la sesión (fallo puntual, no se cierra sesión por esto):", e);
            return token;
          }
          // Revocación inmediata: si un SuperAdmin desactiva a alguien (o
          // archiva su centro) mientras tiene la sesión abierta, se le
          // corta el acceso en cuanto se refresca el token (como mucho, un
          // minuto después), sin tener que esperar a que caduque la sesión.
          // Esto sí es un resultado real de la consulta (no un fallo), así
          // que aquí sí cerramos la sesión.
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
    //
    // Solo para Microsoft: el login por credenciales ya deja su propio
    // registro (con IP/dispositivo/ubicación) dentro de authorize(), que
    // sí tiene acceso a la petición — este evento no lo tiene, así que
    // para Microsoft el registro se queda sin esos datos, como ya pasaba
    // antes de añadir el aviso de dispositivo nuevo.
    async signIn({ user, account }) {
      if (!user?.email || account?.provider !== "azure-ad") return;
      try {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { id: true } });
        await prisma.registroAcceso.create({
          data: {
            userId: dbUser?.id ?? null,
            email: user.email.toLowerCase(),
            nombre: user.name ?? user.email,
            metodo: "microsoft",
          },
        });
      } catch (e) {
        console.error("No se pudo registrar el acceso:", e);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
