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

export async function sendGuardiaEmail(params: {
  to: string;
  profesorName: string;
  turno: string;
  ubicacion: string | null;
  grupo: string | null;
  tarea: string | null;
  fecha: Date;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  await transporter.sendMail({
    from: `Integra <${from}>`,
    to: params.to,
    subject: `Nueva guardia asignada: ${params.turno}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Tienes una guardia nueva, ${params.profesorName}</h2>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Cuándo:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Turno:</strong> ${params.turno}</p>
          ${params.ubicacion ? `<p style="margin:8px 0 0;"><strong>Aula / ubicación:</strong> ${params.ubicacion}</p>` : ""}
          ${params.grupo ? `<p style="margin:8px 0 0;"><strong>Grupo:</strong> ${params.grupo}</p>` : ""}
          ${params.tarea ? `<p style="margin:8px 0 0;"><strong>Qué tienes que hacer:</strong> ${params.tarea}</p>` : ""}
        </div>
        <p style="color:#64748B; font-size:13px;">
          Este aviso se ha añadido automáticamente a tu calendario de Teams. También puedes consultar
          todas tus guardias desde Integra, en el apartado "Guardias".
        </p>
      </div>
    `,
  });
}

export async function sendSalidaCreadaEmail(params: {
  to: string[];
  creadorNombre: string;
  curso: string;
  tipo: string;
  actividad: string;
  fecha: Date;
  horaSalida: string;
  horaVuelta: string | null;
  vueltaDirectaCasa?: boolean;
  numAlumnos: number;
}) {
  if (params.to.length === 0) return;
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  await transporter.sendMail({
    from: `Integra <${from}>`,
    to: params.to.join(", "),
    subject: `Nueva salida pendiente de aprobar: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">${params.creadorNombre} ha propuesto una salida</h2>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Tipo:</strong> ${params.tipo}</p>
          <p style="margin:8px 0 0;"><strong>Curso / Grupo:</strong> ${params.curso}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Horario:</strong> ${params.horaSalida} — ${
      params.vueltaDirectaCasa ? "vuelven directamente a casa" : params.horaVuelta
    }</p>
          <p style="margin:8px 0 0;"><strong>Nº de alumnos:</strong> ${params.numAlumnos}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Está pendiente de aprobación. Puedes revisarla y aceptarla o rechazarla desde
          Integra, en Salidas → Aprobaciones.
        </p>
      </div>
    `,
  });
}

export async function sendSalidaAprobadaEmail(params: {
  to: string;
  profesorNombre: string;
  actividad: string;
  fecha: Date;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  await transporter.sendMail({
    from: `Integra <${from}>`,
    to: params.to,
    subject: `Salida aprobada: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">¡Tu salida ha sido aprobada, ${params.profesorNombre}!</h2>
        <div style="background:#ECFDF5; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #A7F3D0;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0; color:#059669;"><strong>Estado: Aprobada ✓</strong></p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Ya puedes consultarla desde Integra, en el apartado "Salidas".
        </p>
      </div>
    `,
  });
}

export async function sendSalidaRechazadaEmail(params: {
  to: string;
  profesorNombre: string;
  actividad: string;
  fecha: Date;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  await transporter.sendMail({
    from: `Integra <${from}>`,
    to: params.to,
    subject: `Salida rechazada: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0; color:#DC2626;"><strong>Estado: Rechazada</strong></p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Habla con el equipo directivo de tu centro si necesitas más información.
        </p>
      </div>
    `,
  });
}

export async function sendIncidenciaCreadaEmail(params: {
  to: string;
  tutorNombre: string;
  creadorNombre: string;
  alumnoNombre: string;
  curso: string;
  tipoIncidencia: string;
  prioridad: string;
  fecha: Date;
  lugar: string | null;
  descripcion: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const prioridadColor = params.prioridad === "ALTA" ? "#DC2626" : params.prioridad === "MEDIA" ? "#D97706" : "#16A34A";

  await transporter.sendMail({
    from: `Integra <${from}>`,
    to: params.to,
    subject: `Nueva incidencia asignada: ${params.alumnoNombre} (${params.tipoIncidencia})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Se te ha asignado una nueva incidencia</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          ${params.creadorNombre} ha registrado una incidencia y te ha marcado como tutor responsable.
        </p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Alumno:</strong> ${params.alumnoNombre} (${params.curso})</p>
          <p style="margin:8px 0 0;"><strong>Tipo de incidencia:</strong> ${params.tipoIncidencia}</p>
          <p style="margin:8px 0 0;"><strong>Prioridad:</strong> <span style="color:${prioridadColor}; font-weight:bold;">${params.prioridad}</span></p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          ${params.lugar ? `<p style="margin:8px 0 0;"><strong>Lugar:</strong> ${params.lugar}</p>` : ""}
          <p style="margin:8px 0 0;"><strong>Descripción:</strong> ${params.descripcion}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Puedes ver el expediente completo y hacerle seguimiento desde Integra, en Expedientes.
        </p>
      </div>
    `,
  });
}

export async function sendTresIncidenciasEmail(params: {
  to: string[];
  alumnoNombre: string;
  curso: string;
}) {
  if (params.to.length === 0) return;
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Integra <${from}>`,
    to: params.to.join(", "),
    subject: `Aviso: ${params.alumnoNombre} ha llegado a 3 incidencias`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#DC2626; margin-bottom: 8px;">Aviso de 3 incidencias</h2>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;">
            El alumno <strong>${params.alumnoNombre}</strong> (${params.curso}) ha alcanzado
            <strong>3 incidencias</strong> registradas en Integra.
          </p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Puedes revisar el expediente completo y valorar un parte con expulsión desde
          Integra, en Expedientes.
        </p>
      </div>
    `,
  });
}

export async function sendExpedienteEmail(params: {
  to: string;
  tutorNombre: string;
  data: {
    numero: string;
    alumnoNombre: string;
    alumnoCurso: string;
    schoolName: string;
    fechaInicio: string;
    sancionDias: number;
    sancionMotivo?: string;
    fechaAplicacionInicio: string;
    fechaAplicacionFin: string;
    fets: string;
  };
  pdfBuffer: Buffer;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Integra <${from}>`,
    to: params.to,
    subject: `Expediente disciplinario ${params.data.numero} · ${params.data.alumnoNombre}`,
    attachments: [
      {
        filename: `Expedient_${params.data.numero}.pdf`,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Expediente disciplinario enviado</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          Se ha completado y enviado un expediente sancionador del que eres tutor/a. Tienes el documento completo en PDF adjunto a este correo.
        </p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Expedient núm.:</strong> ${params.data.numero}</p>
          <p style="margin:8px 0 0;"><strong>Centre:</strong> ${params.data.schoolName}</p>
          <p style="margin:8px 0 0;"><strong>Alumne:</strong> ${params.data.alumnoNombre} (${params.data.alumnoCurso})</p>
          <p style="margin:8px 0 0;"><strong>Data d'obertura:</strong> ${params.data.fechaInicio}</p>
          <p style="margin:8px 0 0;"><strong>Sanció:</strong> expulsió de ${params.data.sancionDias} dies (del ${params.data.fechaAplicacionInicio} al ${params.data.fechaAplicacionFin})</p>
          <p style="margin:8px 0 0;"><strong>Fets:</strong> ${params.data.fets}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          También puedes consultarlo en cualquier momento desde Integra, en Expedientes.
        </p>
      </div>
    `,
  });
}
