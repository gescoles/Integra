-- CreateTable
CREATE TABLE "ChatbotEntry" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "palabrasClave" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "respuesta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotPreguntaSinResponder" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "vista" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotPreguntaSinResponder_pkey" PRIMARY KEY ("id")
);

-- Contenido inicial, para que el chatbot no empiece completamente vacío.
-- Se puede editar o ampliar desde Integra sin tocar la base de datos.
INSERT INTO "ChatbotEntry" ("id", "pregunta", "palabrasClave", "respuesta", "updatedAt") VALUES
('seed_idioma', '¿Cómo cambio el idioma?', ARRAY['idioma','idiomas','catala','català','ingles','inglés','language','cambiar idioma'], 'Puedes cambiar tu idioma (Català / Español / English) desde el desplegable que aparece justo encima de "Centro asignado", en la parte de abajo del menú lateral. Se aplica al instante.', CURRENT_TIMESTAMP),
('seed_foto', '¿Cómo cambio mi foto de perfil?', ARRAY['foto','perfil','avatar','imagen','cambiar foto'], 'Haz clic en tu nombre, abajo a la izquierda del menú lateral. Se abrirá una ventana donde puedes elegir una foto nueva y guardarla.', CURRENT_TIMESTAMP),
('seed_tutorias_alta', '¿Cómo doy de alta un alumno en Tutorías?', ARRAY['alta alumno','nuevo alumno','crear alumno','añadir alumno','tutorias alumno'], 'Entra en Tutorías → "Nuevo alumno" (en la lista de la izquierda). Rellena nombre, curso, edad, nivel de riesgo y los contactos familiares.', CURRENT_TIMESTAMP),
('seed_tutorias_registrar', '¿Cómo registro una tutoría?', ARRAY['registrar tutoria','nueva tutoria','crear tutoria','tutoria alumno'], 'Selecciona el alumno en Tutorías y pulsa "Registrar nueva tutoría". Indica fecha, hora, con quién ha sido (familia, alumno o ambos) y la causa. Se guarda como "Pendiente" hasta que la cierres.', CURRENT_TIMESTAMP),
('seed_tutorias_cerrar', '¿Cómo cierro una tutoría?', ARRAY['cerrar tutoria','completar tutoria','resumen tutoria'], 'En el historial de tutorías del alumno, pulsa "Cerrar tutoría" en la que quieras cerrar, y escribe el resumen de lo tratado. Pasa a estado "Completada".', CURRENT_TIMESTAMP),
('seed_tutorias_centro', '¿Qué es "Todo el centro" en Tutorías?', ARRAY['todo el centro','tutorias centro','resumen alumno tutorias'], 'Es la vista que ven Coordinación/Dirección y SuperAdmin: todas las tutorías de todos los profesores del centro, con filtros por profesor, estado y curso. También hay un "resumen por alumno" y un botón para descargar un Excel.', CURRENT_TIMESTAMP),
('seed_guardias', '¿Cómo funcionan las Guardias?', ARRAY['guardias','crear guardia','nueva guardia'], 'Coordinación/Dirección y SuperAdmin crean una guardia asignándola a un profesor (turno, aula, grupo, y qué tiene que hacer). En cuanto se crea, el profesor recibe un email automático con los detalles.', CURRENT_TIMESTAMP),
('seed_material', '¿Cómo pido material?', ARRAY['pedir material','nuevo material','solicitar material'], 'Entra en Material → "Nuevo material" (o el botón "+" según tu rol). Indica nombre, categoría, cantidad, precio, proveedor y la justificación de por qué lo necesitas.', CURRENT_TIMESTAMP),
('seed_material_centro', '¿Cómo veo el material de todo el centro?', ARRAY['material centro','todo el material'], 'Coordinación/Dirección y SuperAdmin ven todo el material pedido en el centro, con filtros por curso y por profesor, y pueden descargar un Excel con una pestaña por ciclo.', CURRENT_TIMESTAMP),
('seed_salidas_crear', '¿Cómo creo una salida?', ARRAY['crear salida','nueva salida','excursion'], 'Cualquier profesor puede entrar en Salidas → "Nueva salida" y rellenar curso, actividad, tipo, fecha, horario, responsable, profesores acompañantes, número de alumnos, coste y si vuelven directamente a casa. Queda en estado "Pendiente" hasta que el equipo directivo la revise.', CURRENT_TIMESTAMP),
('seed_salidas_aprobar', '¿Cómo apruebo o rechazo una salida?', ARRAY['aprobar salida','rechazar salida','aprobaciones'], 'Solo Coordinación/Dirección y SuperAdmin pueden hacerlo, desde el submenú "Aprobaciones" dentro de Salidas. Ahí verás todas las pendientes con toda su información, y botones para aprobar o rechazar. El profesor recibe un email avisándole de la decisión.', CURRENT_TIMESTAMP),
('seed_salidas_notif', '¿Por qué recibo notificaciones de salidas?', ARRAY['notificacion salida','aviso salida'], 'Cuando un profesor crea una salida, se avisa por email y con una notificación real (la campanita) a todo el equipo directivo del centro. En cuanto se aprueba o rechaza, esa notificación desaparece para todos automáticamente.', CURRENT_TIMESTAMP),
('seed_calendario', '¿Qué es el Calendario?', ARRAY['calendario','eventos','mis eventos'], 'Es tu calendario personal: además de los eventos que añadas tú, se reflejan automáticamente tus tutorías, guardias y horario de clases. Está dentro del apartado "Utilidades" del menú.', CURRENT_TIMESTAMP),
('seed_horario', '¿Cómo configuro mi horario?', ARRAY['mi horario','horario semanal','crear horario'], 'En "Mi horario" (dentro de Utilidades), pulsa "Programar" para añadir un bloque de clase: día, hora, asignatura, grupo y color.', CURRENT_TIMESTAMP),
('seed_notificaciones', '¿Dónde veo mis notificaciones?', ARRAY['notificaciones','campanita','avisos'], 'En la campanita de la esquina superior derecha. Te muestra un número con las que tienes sin leer, y al hacer clic en una te lleva directamente a la pantalla relacionada.', CURRENT_TIMESTAMP),
('seed_usuarios', '¿Cómo creo un usuario nuevo?', ARRAY['crear usuario','nuevo usuario','añadir usuario'], 'SuperAdmin y Coordinación pueden crear usuarios desde Usuarios → "Crear nuevo usuario": nombre, email, rol y centro. Se puede generar una contraseña automática que se envía por email.', CURRENT_TIMESTAMP),
('seed_centros_modulos', '¿Cómo activo un módulo para un centro?', ARRAY['activar modulo','modulo contratado','centro modulos'], 'Solo el SuperAdmin puede hacerlo: entra en Centros → edita el centro → marca o desmarca los módulos que quieras que tenga contratados (Tutorías, Guardias, Material, Salidas, Utilidades...). Si un módulo no está activado, sale bloqueado con un candado para ese centro.', CURRENT_TIMESTAMP),
('seed_excel', '¿Cómo descargo un Excel?', ARRAY['descargar excel','exportar excel'], 'En Tutorías, Material y Salidas hay un botón verde "Descargar Excel" (visible para Coordinación/Dirección y SuperAdmin) que genera un archivo con una pestaña por profesor o por ciclo, según el módulo.', CURRENT_TIMESTAMP),
('seed_backup', '¿Se hacen copias de seguridad?', ARRAY['backup','copia de seguridad'], 'Sí, cada noche se genera automáticamente un Excel de Tutorías, Material y Salidas de cada centro y se sube a una carpeta de Google Drive, organizada por centro y por módulo.', CURRENT_TIMESTAMP),
('seed_roles', '¿Qué puede hacer cada rol?', ARRAY['roles','permisos','que puede hacer'], 'Profesor: gestiona sus propios alumnos, tutorías, guardias, material, salidas y horario. Coordinación/Dirección: todo eso pero de todo el centro, más aprobar/rechazar salidas y gestionar usuarios. SuperAdmin: todo lo anterior en todos los centros, más crear centros y gestionar planes.', CURRENT_TIMESTAMP);
