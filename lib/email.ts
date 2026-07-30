import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "Faltan las variables de entorno de SMTP (SMTP_HOST, SMTP_USER, SMTP_PASSWORD). No se puede enviar el email."
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordEmail(to: string, name: string, password: string) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Integra <${from}>`,
    to,
    subject: "Tu acceso a Integra",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Bienvenido/a a Integra, ${name}</h2>
        <p>Se ha creado tu cuenta en la plataforma de gestión de tu centro educativo. Estas son tus credenciales de acceso:</p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Email:</strong> ${to}</p>
          <p style="margin:8px 0 0;"><strong>Contraseña:</strong> <code style="background:#fff; padding:2px 6px; border-radius:4px;">${password}</code></p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Por seguridad, no compartas esta contraseña con nadie. Si necesitas
          cambiarla, contacta con el administrador de tu centro.
        </p>
      </div>
    `,
  });
}
