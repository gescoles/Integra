import { LegalLayout } from "../components/LegalLayout";

export default function TerminosPage() {
  return (
    <LegalLayout titulo="Términos de servicio" actualizado="agosto de 2026">
      <p>
        Los presentes Términos de Servicio regulan el acceso y utilización de
        Docentium, plataforma digital destinada a facilitar la gestión,
        organización y coordinación de determinados procesos internos de
        centros educativos.
      </p>
      <p>
        El acceso o utilización de Docentium implica la aceptación de estos
        términos por parte del usuario, sin perjuicio de las condiciones
        particulares que puedan acordarse con cada centro educativo.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">1. Objeto del servicio</h2>
      <p>
        Docentium pone a disposición de centros educativos una plataforma
        digital que puede incluir, entre otras funcionalidades, la gestión de
        tutorías, incidencias, prácticas, salidas, solicitudes de material,
        guardias, comunicaciones, calendarios, noticias, foros y otras
        herramientas relacionadas con la organización del centro.
      </p>
      <p>
        Las funcionalidades disponibles podrán variar dependiendo del plan
        contratado y de los módulos habilitados para cada centro.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">2. Registro y cuentas de usuario</h2>
      <p>
        Para acceder a determinadas funcionalidades será necesario disponer
        de una cuenta de usuario asociada a un centro educativo autorizado.
      </p>
      <p>
        El usuario se compromete a proporcionar información veraz, exacta y
        actualizada, así como a mantener la confidencialidad de sus
        credenciales de acceso.
      </p>
      <p>
        Las cuentas son personales e intransferibles. El usuario será
        responsable de cualquier actividad realizada desde su cuenta cuando
        se haya producido por un uso negligente de sus credenciales.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">3. Uso adecuado de la plataforma</h2>
      <p>
        Los usuarios deberán utilizar Docentium de forma responsable y
        únicamente para las finalidades relacionadas con la actividad
        educativa y organizativa del centro.
      </p>
      <p>
        Queda prohibido utilizar la plataforma para realizar actividades
        ilícitas, introducir contenidos maliciosos, intentar acceder a
        información sin autorización, alterar el funcionamiento del servicio
        o vulnerar los derechos de terceros.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">4. Contenido introducido por los usuarios</h2>
      <p>
        Los centros educativos y sus usuarios son responsables de la
        información y documentación que incorporen a la plataforma.
      </p>
      <p>
        Docentium podrá actuar como proveedor tecnológico y, cuando
        corresponda, como encargado del tratamiento de determinados datos
        personales en nombre del centro educativo.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">5. Disponibilidad del servicio</h2>
      <p>
        Docentium procurará mantener la plataforma disponible de manera
        continuada y aplicar medidas razonables para garantizar su correcto
        funcionamiento.
      </p>
      <p>
        No obstante, podrán producirse interrupciones temporales debido a
        tareas de mantenimiento, actualizaciones, incidencias técnicas o
        circunstancias ajenas al control del servicio.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">6. Modificaciones</h2>
      <p>
        Docentium podrá actualizar o modificar determinadas funcionalidades
        para mejorar el servicio, adaptarlo a cambios tecnológicos o cumplir
        obligaciones legales.
      </p>
      <p>
        Las modificaciones sustanciales de las condiciones de servicio serán
        comunicadas cuando resulte necesario.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">7. Propiedad intelectual</h2>
      <p>
        El diseño, estructura, código, logotipos, elementos gráficos, textos
        y demás componentes propios de Docentium están protegidos por la
        normativa aplicable en materia de propiedad intelectual e industrial.
      </p>
      <p>
        No se permite su reproducción, distribución, modificación o
        explotación sin autorización previa.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">8. Suspensión de cuentas</h2>
      <p>
        Docentium podrá suspender temporalmente el acceso a una cuenta cuando
        exista un incumplimiento grave de estas condiciones, un riesgo para
        la seguridad de la plataforma o una utilización fraudulenta del
        servicio.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">9. Contacto</h2>
      <p>
        Para cualquier consulta relacionada con estos términos puede
        contactar mediante:
      </p>
      <p>
        Correo electrónico:{" "}
        <a href="mailto:gescoles@gmail.com" className="font-semibold text-[#FD5249]">
          gescoles@gmail.com
        </a>
      </p>
    </LegalLayout>
  );
}
