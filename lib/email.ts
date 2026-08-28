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
    from: `Docentium <${from}>`,
    to,
    subject: "Tu acceso a Docentium",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Bienvenido/a a Docentium, ${name}</h2>
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

export async function sendInvitacionMicrosoftEmail(to: string, name: string) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const loginUrl = process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/login` : "https://docentium.org/login";

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to,
    subject: "Tu acceso a Docentium",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Bienvenido/a a Docentium, ${name}</h2>
        <p>Se ha creado tu cuenta en la plataforma de gestión de tu centro educativo.</p>
        <p>No hace falta ninguna contraseña nueva: entra con tu cuenta de Microsoft/Teams de siempre (<strong>${to}</strong>), pulsando en "Iniciar sesión con Microsoft" en la pantalla de acceso.</p>
        <div style="margin:20px 0; text-align:center;">
          <a href="${loginUrl}" style="background:#FD5249; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Ir a Docentium
          </a>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Si tienes cualquier problema para entrar, contacta con el administrador de tu centro.
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
    from: `Docentium <${from}>`,
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
          todas tus guardias desde Docentium, en el apartado "Guardias".
        </p>
      </div>
    `,
  });
}

export async function sendSalidaCreadaEmail(params: {
  to: string[];
  creadorNombre: string;
  curso: string;
  tipo: string | null;
  actividad: string;
  fecha: Date;
  horaSalida: string;
  horaVuelta: string | null;
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
    from: `Docentium <${from}>`,
    to: params.to.join(", "),
    subject: `Nueva salida pendiente de aprobar: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">${params.creadorNombre} ha propuesto una salida</h2>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Tipo:</strong> ${params.tipo ?? "—"}</p>
          <p style="margin:8px 0 0;"><strong>Curso / Grupo:</strong> ${params.curso}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Horario:</strong> ${params.horaSalida} — ${params.horaVuelta}</p>
          <p style="margin:8px 0 0;"><strong>Nº de alumnos:</strong> ${params.numAlumnos}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Está pendiente de aprobación. Puedes revisarla y aceptarla o rechazarla desde
          Docentium, en Salidas → Aprobaciones.
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
    from: `Docentium <${from}>`,
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
          Ya puedes consultarla desde Docentium, en el apartado "Salidas".
        </p>
      </div>
    `,
  });
}

export async function sendSalidaDetalleAcompananteEmail(params: {
  to: string;
  profesorNombre: string;
  actividad: string;
  curso: string;
  tipo: string | null;
  fecha: Date;
  horaSalida: string;
  horaVuelta: string | null;
  numAlumnos: number;
  responsableNombre: string;
  departamentoNombre: string | null;
  informacion: string | null;
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
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Acompañas en la salida: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p style="margin:0 0 12px;">Te han asignado como acompañante en esta salida, ya aprobada. Aquí tienes todos los detalles:</p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Curso/Grupo:</strong> ${params.curso}</p>
          ${params.tipo ? `<p style="margin:8px 0 0;"><strong>Tipo:</strong> ${params.tipo}</p>` : ""}
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Horario:</strong> ${params.horaSalida}${params.horaVuelta ? ` — ${params.horaVuelta}` : ""}</p>
          <p style="margin:8px 0 0;"><strong>Nº de alumnos:</strong> ${params.numAlumnos}</p>
          <p style="margin:8px 0 0;"><strong>Responsable:</strong> ${params.responsableNombre}</p>
          ${params.departamentoNombre ? `<p style="margin:8px 0 0;"><strong>Departamento:</strong> ${params.departamentoNombre}</p>` : ""}
          ${params.informacion ? `<p style="margin:8px 0 0;"><strong>Información:</strong> ${params.informacion}</p>` : ""}
        </div>
        <p style="color:#64748B; font-size:13px;">
          Este correo se ha enviado automáticamente desde Docentium.
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
    from: `Docentium <${from}>`,
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

export async function sendSalidaAnuladaEmail(params: {
  to: string;
  profesorNombre: string;
  actividad: string;
  fecha: Date;
  motivo: string;
  anuladoPorNombre: string;
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
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Salida anulada: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p style="margin:0 0 12px;">La siguiente salida, ya aprobada, ha sido anulada por ${params.anuladoPorNombre}.</p>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0; color:#DC2626;"><strong>Estado: Anulada</strong></p>
          <p style="margin:8px 0 0;"><strong>Motivo:</strong> ${params.motivo}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Habla con dirección de tu centro si necesitas más información.
        </p>
      </div>
    `,
  });
}

export async function sendSalidaEliminadaEmail(params: {
  to: string;
  profesorNombre: string;
  actividad: string;
  curso: string;
  fecha: Date;
  eliminadoPorNombre: string;
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
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Salida eliminada: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p style="margin:0 0 12px;">La siguiente salida ha sido eliminada por ${params.eliminadoPorNombre}. Ya no tienes que contar con ella.</p>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Curso/Grupo:</strong> ${params.curso}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0; color:#DC2626;"><strong>Estado: Eliminada</strong></p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Este correo se ha enviado automáticamente desde Docentium.
        </p>
      </div>
    `,
  });
}

export async function sendSalidaYaNoAcompananteEmail(params: {
  to: string;
  profesorNombre: string;
  actividad: string;
  curso: string;
  fecha: Date;
  quitadoPorNombre: string;
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
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Ya no acompañas en: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p style="margin:0 0 12px;">${params.quitadoPorNombre} te ha quitado como acompañante de esta salida. La salida sigue adelante, pero ya no formas parte de ella — no hace falta que cuentes con este día.</p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Curso/Grupo:</strong> ${params.curso}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Este correo se ha enviado automáticamente desde Docentium.
        </p>
      </div>
    `,
  });
}

export async function sendSalidaModificadaEmail(params: {
  to: string;
  profesorNombre: string;
  actividad: string;
  curso: string;
  tipo: string | null;
  fecha: Date;
  horaSalida: string;
  horaVuelta: string | null;
  numAlumnos: number;
  responsableNombre: string;
  departamentoNombre: string | null;
  informacion: string | null;
  modificadoPorNombre: string;
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
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Salida modificada: ${params.actividad}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p style="margin:0 0 12px;">${params.modificadoPorNombre} ha modificado esta salida. Aquí tienes la información actualizada:</p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Actividad:</strong> ${params.actividad}</p>
          <p style="margin:8px 0 0;"><strong>Curso/Grupo:</strong> ${params.curso}</p>
          ${params.tipo ? `<p style="margin:8px 0 0;"><strong>Tipo:</strong> ${params.tipo}</p>` : ""}
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Horario:</strong> ${params.horaSalida}${params.horaVuelta ? ` — ${params.horaVuelta}` : ""}</p>
          <p style="margin:8px 0 0;"><strong>Nº de alumnos:</strong> ${params.numAlumnos}</p>
          <p style="margin:8px 0 0;"><strong>Responsable:</strong> ${params.responsableNombre}</p>
          ${params.departamentoNombre ? `<p style="margin:8px 0 0;"><strong>Departamento:</strong> ${params.departamentoNombre}</p>` : ""}
          ${params.informacion ? `<p style="margin:8px 0 0;"><strong>Información:</strong> ${params.informacion}</p>` : ""}
        </div>
        <p style="color:#64748B; font-size:13px;">
          Este correo se ha enviado automáticamente desde Docentium.
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
    from: `Docentium <${from}>`,
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
          Puedes ver el expediente completo y hacerle seguimiento desde Docentium, en Expedientes.
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
    from: `Docentium <${from}>`,
    to: params.to.join(", "),
    subject: `Aviso: ${params.alumnoNombre} ha llegado a 3 incidencias`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#DC2626; margin-bottom: 8px;">Aviso de 3 incidencias</h2>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;">
            El alumno <strong>${params.alumnoNombre}</strong> (${params.curso}) ha alcanzado
            <strong>3 incidencias</strong> registradas en Docentium.
          </p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Puedes revisar el expediente completo y valorar un parte con expulsión desde
          Docentium, en Expedientes.
        </p>
      </div>
    `,
  });
}

export async function sendExpedienteEmail(params: {
  to: string[];
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
    from: `Docentium <${from}>`,
    to: params.to.join(", "),
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
          También puedes consultarlo en cualquier momento desde Docentium, en Expedientes.
        </p>
      </div>
    `,
  });
}

export async function sendIncidenciasCerradasEmail(params: {
  to: string[];
  alumnoNombre: string;
  curso: string;
  cantidad: number;
}) {
  if (params.to.length === 0) return;
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to.join(", "),
    subject: `Aviso: ${params.alumnoNombre} ya lleva ${params.cantidad} incidencias cerradas`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#DC2626; margin-bottom: 8px;">Aviso de incidencias cerradas</h2>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;">
            El alumno <strong>${params.alumnoNombre}</strong> (${params.curso}) ya tiene
            <strong>${params.cantidad} incidencias cerradas</strong> registradas en Docentium.
          </p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Puedes revisar su historial completo y valorar si hace falta abrir un expediente
          desde Docentium, en Expedientes.
        </p>
      </div>
    `,
  });
}

export async function sendOnboardingArchivoEmail(params: {
  to: string[];
  carpetaNombre: string;
  archivoNombre: string;
  subidoPorNombre: string;
  schoolName: string;
}) {
  if (params.to.length === 0) return;
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    bcc: params.to,
    subject: `Nuevo documento de OnBoarding: ${params.archivoNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Nuevo documento en OnBoarding</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          ${params.subidoPorNombre} ha subido un archivo nuevo en ${params.schoolName}.
        </p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Carpeta:</strong> ${params.carpetaNombre}</p>
          <p style="margin:8px 0 0;"><strong>Archivo:</strong> ${params.archivoNombre}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Puedes verlo y descargarlo desde Docentium, en OnBoarding.
        </p>
      </div>
    `,
  });
}

export async function sendResumenIncidenciaEmail(params: {
  to: string;
  alumnoNombre: string;
  curso: string;
  tipoIncidencia: string;
  fecha: Date;
  descripcion: string;
  medidasAplicadas?: string | null;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Resumen de incidencia: ${params.alumnoNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Resumen de incidencia cerrada</h2>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Alumno:</strong> ${params.alumnoNombre} (${params.curso})</p>
          <p style="margin:8px 0 0;"><strong>Tipo de incidencia:</strong> ${params.tipoIncidencia}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Descripción:</strong> ${params.descripcion}</p>
          ${params.medidasAplicadas ? `<p style="margin:8px 0 0;"><strong>Medidas aplicadas:</strong> ${params.medidasAplicadas}</p>` : ""}
        </div>
        <p style="color:#64748B; font-size:13px;">Este correo es un resumen informativo enviado desde Docentium.</p>
      </div>
    `,
  });
}

export async function sendReservaConfirmadaEmail(params: {
  to: string;
  userNombre: string;
  aulaNombre: string;
  schoolName: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
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
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Reserva confirmada: ${params.aulaNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">¡Reserva confirmada!</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          Hola ${params.userNombre}, tu reserva en ${params.schoolName} ya está confirmada.
        </p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Espacio:</strong> ${params.aulaNombre}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Hora:</strong> ${params.horaInicio} – ${params.horaFin}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Puedes consultar o cancelar tu reserva desde Docentium, en Reserva de Espacios.
        </p>
      </div>
    `,
  });
}

export async function sendCoberturaEmail(params: {
  to: string;
  sustitutoNombre: string;
  ausenteNombre: string;
  asignatura: string | null;
  grupo: string | null;
  ubicacion: string | null;
  trabajoAlumnos?: string | null;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Guardia: cubre la clase de ${params.ausenteNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Se te necesita para cubrir una clase</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          Hola ${params.sustitutoNombre}, ${params.ausenteNombre} no puede dar su clase y,
          como estás de guardia en ese horario, te han asignado para cubrirla.
        </p>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Hora:</strong> ${params.horaInicio} – ${params.horaFin}</p>
          ${params.asignatura ? `<p style="margin:8px 0 0;"><strong>Asignatura:</strong> ${params.asignatura}</p>` : ""}
          ${params.grupo ? `<p style="margin:8px 0 0;"><strong>Grupo:</strong> ${params.grupo}</p>` : ""}
          ${params.ubicacion ? `<p style="margin:8px 0 0;"><strong>Aula/Ubicación:</strong> ${params.ubicacion}</p>` : ""}
          ${params.trabajoAlumnos ? `<p style="margin:8px 0 0;"><strong>Qué tienen que hacer los alumnos:</strong> ${params.trabajoAlumnos}</p>` : ""}
        </div>
        <p style="color:#64748B; font-size:13px;">
          Este aviso se ha generado automáticamente desde Docentium, en Guardias.
        </p>
      </div>
    `,
  });
}

export async function sendSolicitudCoberturaEmail(params: {
  to: string[];
  profesorNombre: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  trabajoAlumnos: string;
  motivo?: string | null;
  asignatura?: string | null;
  grupo?: string | null;
  aula?: string | null;
}) {
  if (params.to.length === 0) return;
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" });

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    bcc: params.to,
    subject: `${params.profesorNombre} no podrá estar: falta cubrir una guardia`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Aviso de ausencia</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          ${params.profesorNombre} ha avisado de que no podrá estar en clase y hace falta buscar quién le cubre.
        </p>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Hora:</strong> ${params.horaInicio} – ${params.horaFin}</p>
          ${params.asignatura ? `<p style="margin:8px 0 0;"><strong>Asignatura:</strong> ${params.asignatura}</p>` : ""}
          ${params.grupo ? `<p style="margin:8px 0 0;"><strong>Grupo:</strong> ${params.grupo}</p>` : ""}
          ${params.aula ? `<p style="margin:8px 0 0;"><strong>Aula:</strong> ${params.aula}</p>` : ""}
          ${params.motivo ? `<p style="margin:8px 0 0;"><strong>Motivo:</strong> ${params.motivo}</p>` : ""}
          <p style="margin:8px 0 0;"><strong>Trabajo para los alumnos:</strong> ${params.trabajoAlumnos}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Entra en Docentium, en Guardias, para asignar quién va a cubrir esta clase.
        </p>
      </div>
    `,
  });
}

export async function sendAusenciaAceptadaEmail(params: {
  to: string;
  ausenteNombre: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Tu aviso de ausencia ha sido aceptado`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.ausenteNombre},</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          Dirección ha aceptado tu aviso de ausencia. Ahora están buscando quién te cubre.
        </p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Hora:</strong> ${params.horaInicio} – ${params.horaFin}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          En cuanto te asignen sustituto/a, te llegará otro aviso con quién es.
          Este aviso se ha generado automáticamente desde Docentium, en Guardias.
        </p>
      </div>
    `,
  });
}

export async function sendCoberturaResueltaEmail(params: {
  to: string;
  ausenteNombre: string;
  sustitutoNombre: string;
  sustitutoEmail: string | null;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Ya tienes quien te cubra: ${params.sustitutoNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Tu ausencia ya tiene sustituto/a</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          Hola ${params.ausenteNombre}, dirección ya ha asignado quién te cubre.
        </p>
        <div style="background:#ECFDF5; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #A7F3D0;">
          <p style="margin:0;"><strong>Te cubre:</strong> ${params.sustitutoNombre}</p>
          ${params.sustitutoEmail ? `<p style="margin:8px 0 0;"><strong>Contacto:</strong> ${params.sustitutoEmail}</p>` : ""}
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Hora:</strong> ${params.horaInicio} – ${params.horaFin}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Si necesitas comentarle algo sobre la clase, puedes escribirle directamente.
          Este aviso se ha generado automáticamente desde Docentium, en Guardias.
        </p>
      </div>
    `,
  });
}

export async function sendSolicitudRechazadaEmail(params: {
  to: string;
  ausenteNombre: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  motivoRechazo: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Tu aviso de ausencia ha sido rechazado`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Solicitud rechazada</h2>
        <p style="color:#64748B; font-size:13px; margin-top:0;">
          Hola ${params.ausenteNombre}, dirección ha rechazado tu aviso de ausencia para esta franja.
        </p>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Hora:</strong> ${params.horaInicio} – ${params.horaFin}</p>
          <p style="margin:8px 0 0;"><strong>Motivo del rechazo:</strong> ${params.motivoRechazo}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Si tienes dudas, ponte en contacto con dirección. Este aviso se ha generado automáticamente desde Docentium, en Guardias.
        </p>
      </div>
    `,
  });
}

// Cuando dirección elimina una guardia puntual (creada con "+ Nueva
// guardia") que ya tenía profesor asignado.
export async function sendGuardiaEliminadaEmail(params: {
  to: string;
  profesorName: string;
  turno: string;
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
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Guardia cancelada: ${params.turno}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Se ha cancelado una guardia, ${params.profesorName}</h2>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;"><strong>Cuándo era:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Turno:</strong> ${params.turno}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Dirección ha eliminado esta guardia de tu agenda. Ya no tienes que cubrirla.
          Este aviso se ha generado automáticamente desde Docentium, en Guardias.
        </p>
      </div>
    `,
  });
}

// Cuando dirección modifica los datos de una guardia puntual ya asignada
// (cambia hora, aula, grupo o la tarea a realizar).
export async function sendGuardiaModificadaEmail(params: {
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
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Guardia modificada: ${params.turno}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Han cambiado los datos de tu guardia, ${params.profesorName}</h2>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Cuándo:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Turno:</strong> ${params.turno}</p>
          ${params.ubicacion ? `<p style="margin:8px 0 0;"><strong>Aula / ubicación:</strong> ${params.ubicacion}</p>` : ""}
          ${params.grupo ? `<p style="margin:8px 0 0;"><strong>Grupo:</strong> ${params.grupo}</p>` : ""}
          ${params.tarea ? `<p style="margin:8px 0 0;"><strong>Qué tienes que hacer:</strong> ${params.tarea}</p>` : ""}
        </div>
        <p style="color:#64748B; font-size:13px;">
          Revisa los datos actualizados. Este aviso se ha generado automáticamente desde Docentium, en Guardias.
        </p>
      </div>
    `,
  });
}

// Cuando dirección elimina una cobertura ya asignada (la que había
// resuelto una solicitud de ausencia de otro profesor).
export async function sendCoberturaEliminadaEmail(params: {
  to: string;
  sustitutoNombre: string;
  ausenteNombre: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Guardia cancelada: ya no cubres a ${params.ausenteNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Se ha cancelado una cobertura, ${params.sustitutoNombre}</h2>
        <div style="background:#FEF2F2; border-radius:8px; padding:16px; margin:16px 0; border:1px solid #FECACA;">
          <p style="margin:0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Hora:</strong> ${params.horaInicio} – ${params.horaFin}</p>
          <p style="margin:8px 0 0;"><strong>Cubrías a:</strong> ${params.ausenteNombre}</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Dirección ha eliminado esta cobertura de tu agenda. Ya no tienes que cubrir esta clase.
          Este aviso se ha generado automáticamente desde Docentium, en Guardias.
        </p>
      </div>
    `,
  });
}

// Cuando dirección modifica los datos de una cobertura ya asignada.
export async function sendCoberturaModificadaEmail(params: {
  to: string;
  sustitutoNombre: string;
  ausenteNombre: string;
  asignatura: string | null;
  grupo: string | null;
  ubicacion: string | null;
  trabajoAlumnos?: string | null;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fechaFmt = params.fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Cobertura modificada: cubres a ${params.ausenteNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Han cambiado los datos de tu cobertura, ${params.sustitutoNombre}</h2>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Fecha:</strong> ${fechaFmt}</p>
          <p style="margin:8px 0 0;"><strong>Hora:</strong> ${params.horaInicio} – ${params.horaFin}</p>
          ${params.asignatura ? `<p style="margin:8px 0 0;"><strong>Asignatura:</strong> ${params.asignatura}</p>` : ""}
          ${params.grupo ? `<p style="margin:8px 0 0;"><strong>Grupo:</strong> ${params.grupo}</p>` : ""}
          ${params.ubicacion ? `<p style="margin:8px 0 0;"><strong>Aula/Ubicación:</strong> ${params.ubicacion}</p>` : ""}
          ${params.trabajoAlumnos ? `<p style="margin:8px 0 0;"><strong>Qué tienen que hacer los alumnos:</strong> ${params.trabajoAlumnos}</p>` : ""}
        </div>
        <p style="color:#64748B; font-size:13px;">
          Revisa los datos actualizados. Este aviso se ha generado automáticamente desde Docentium, en Guardias.
        </p>
      </div>
    `,
  });
}

export async function sendSolicitudCentroEmail(params: {
  tipo: "demo" | "registro";
  centro: string;
  responsable: string;
  cargo: string;
  telefono: string;
  email: string;
  numAlumnos?: string;
  mensaje?: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const destino = process.env.LEADS_EMAIL || "gescoles@gmail.com";
  const asunto = params.tipo === "demo" ? "Nueva solicitud de demo" : "Nueva solicitud de registro de centro";

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: destino,
    replyTo: params.email,
    subject: `${asunto}: ${params.centro}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">${asunto}</h2>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Centro:</strong> ${params.centro}</p>
          <p style="margin:8px 0 0;"><strong>Responsable:</strong> ${params.responsable} (${params.cargo})</p>
          <p style="margin:8px 0 0;"><strong>Teléfono:</strong> ${params.telefono}</p>
          <p style="margin:8px 0 0;"><strong>Email:</strong> ${params.email}</p>
          ${params.numAlumnos ? `<p style="margin:8px 0 0;"><strong>Nº aprox. de alumnos:</strong> ${params.numAlumnos}</p>` : ""}
          ${params.mensaje ? `<p style="margin:8px 0 0;"><strong>Mensaje:</strong> ${params.mensaje}</p>` : ""}
        </div>
        <p style="color:#64748B; font-size:13px;">
          Este formulario se ha enviado desde la web pública de Docentium.
        </p>
      </div>
    `,
  });
}

export async function sendNotasConvenioEmail(params: {
  destinatarios: { name: string | null; email: string }[];
  alumnoNombre: string;
  empresaNombre: string | null;
  departamentoNombre: string;
  notaFinal: string;
  modulos: { codigo: string; nombre: string }[];
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const filas = params.modulos
    .map(
      (m) => `
      <tr>
        <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0;">${m.codigo}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0;">${m.nombre}</td>
      </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <h2 style="color:#0B1D4D; margin-bottom: 4px;">Nota de pràctiques — ${params.alumnoNombre}</h2>
      <p style="color:#64748B; margin-top:0;">Departament de ${params.departamentoNombre}${params.empresaNombre ? ` · Empresa: ${params.empresaNombre}` : ""}</p>
      <div style="background:#F1F5F9; border-radius:8px; padding:14px 16px; margin:16px 0; text-align:center;">
        <span style="font-size:13px; color:#64748B;">Nota final</span><br/>
        <span style="font-size:22px; font-weight:bold; color:#0B1D4D;">${params.notaFinal}</span>
      </div>
      <p style="color:#334155; font-size:13px; margin-bottom:6px;">Mòduls avaluats en aquest conveni:</p>
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr style="background:#F1F5F9; text-align:left;">
            <th style="padding:8px 12px;">Mòdul</th>
            <th style="padding:8px 12px;">Nom</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="color:#94A3B8; font-size:13px; margin-top:20px;">
        Aquest correu s'ha enviat automàticament des de Docentium.
      </p>
    </div>
  `;

  await Promise.all(
    params.destinatarios.map((d) =>
      transporter.sendMail({
        from: `Docentium <${from}>`,
        to: d.email,
        subject: `Nota de pràctiques · ${params.alumnoNombre}`,
        html,
      })
    )
  );
}

export async function sendMaterialNuevoEmail(params: {
  to: string;
  adminNombre: string;
  profesorNombre: string;
  nombreMaterial: string;
  curso: string;
  cantidad: number;
  precioUnidad: number;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const total = (params.cantidad * params.precioUnidad).toFixed(2);

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Nueva solicitud de material: ${params.nombreMaterial}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.adminNombre},</h2>
        <p style="margin:0 0 12px;">${params.profesorNombre} ha pedido un material nuevo, pendiente de validar.</p>
        <div style="background:#F1F5F9; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0;"><strong>Material:</strong> ${params.nombreMaterial}</p>
          <p style="margin:8px 0 0;"><strong>Curso:</strong> ${params.curso}</p>
          <p style="margin:8px 0 0;"><strong>Cantidad:</strong> ${params.cantidad}</p>
          <p style="margin:8px 0 0;"><strong>Total estimado:</strong> ${total} €</p>
        </div>
        <p style="color:#64748B; font-size:13px;">
          Puedes revisarlo y validarlo desde Docentium, en el apartado "Material".
        </p>
      </div>
    `,
  });
}

export async function sendMaterialValidadoEmail(params: {
  to: string;
  profesorNombre: string;
  nombreMaterial: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Material aprobado: ${params.nombreMaterial}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p>Tu material <strong>"${params.nombreMaterial}"</strong> ha sido aprobado y ya está en curso de compra.</p>
        <p style="color:#64748B; font-size:13px;">
          Te avisaremos por aquí en cuanto llegue al centro y puedas pasar a recogerlo.
        </p>
      </div>
    `,
  });
}

export async function sendMaterialCompradoEmail(params: {
  to: string;
  profesorNombre: string;
  nombreMaterial: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Ya puedes recoger tu material: ${params.nombreMaterial}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p>Tu material <strong>"${params.nombreMaterial}"</strong> ya ha llegado al centro.</p>
        <p>Puedes pasar a recogerlo por secretaría cuando puedas.</p>
      </div>
    `,
  });
}

export async function sendMaterialModificadoEmail(params: {
  to: string;
  profesorNombre: string;
  nombreMaterial: string;
  modificadoPorNombre: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Tu solicitud de material ha sido modificada: ${params.nombreMaterial}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p>${params.modificadoPorNombre} ha modificado tu solicitud de material <strong>"${params.nombreMaterial}"</strong>.</p>
        <p style="color:#64748B; font-size:13px;">
          Puedes revisar los cambios desde Docentium, en el apartado "Material".
        </p>
      </div>
    `,
  });
}

export async function sendMaterialEliminadoEmail(params: {
  to: string;
  profesorNombre: string;
  nombreMaterial: string;
  eliminadoPorNombre: string;
}) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `Docentium <${from}>`,
    to: params.to,
    subject: `Tu solicitud de material ha sido eliminada: ${params.nombreMaterial}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0B1D4D; margin-bottom: 8px;">Hola ${params.profesorNombre},</h2>
        <p>${params.eliminadoPorNombre} ha eliminado tu solicitud de material <strong>"${params.nombreMaterial}"</strong>.</p>
        <p style="color:#64748B; font-size:13px;">
          Si crees que ha sido un error, ponte en contacto con Administración.
        </p>
      </div>
    `,
  });
}
