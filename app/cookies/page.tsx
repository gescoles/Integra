import { LegalLayout } from "../components/LegalLayout";

export default function CookiesPage() {
  return (
    <LegalLayout titulo="Política de cookies" actualizado="agosto de 2026">
      <p>
        La presente Política de Cookies explica qué son las cookies y cómo
        pueden utilizarse en la web y plataforma de Docentium.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos que pueden almacenarse en el
        dispositivo del usuario cuando visita una página web.
      </p>
      <p>
        Permiten, entre otras funciones, recordar preferencias, mantener
        sesiones iniciadas, reforzar la seguridad o analizar el uso de
        determinadas funcionalidades.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">2. Cookies utilizadas</h2>
      <p>Docentium podrá utilizar las siguientes categorías:</p>

      <h3 className="text-base font-bold text-[#0B1D4D]">Cookies técnicas o necesarias</h3>
      <p>
        Son aquellas imprescindibles para permitir la navegación, iniciar
        sesión, mantener la seguridad y utilizar las funcionalidades básicas
        de la plataforma.
      </p>
      <p>
        Estas cookies no requieren consentimiento cuando resultan
        estrictamente necesarias para prestar el servicio solicitado por el
        usuario.
      </p>

      <h3 className="text-base font-bold text-[#0B1D4D]">Cookies de preferencias</h3>
      <p>
        Permiten recordar determinadas configuraciones, como el idioma
        seleccionado o ciertas preferencias de visualización.
      </p>

      <h3 className="text-base font-bold text-[#0B1D4D]">Cookies analíticas</h3>
      <p>
        En caso de utilizar herramientas de medición, estas cookies
        permitirán conocer de forma agregada cómo se utiliza la plataforma
        con el objetivo de mejorar su funcionamiento.
      </p>
      <p>
        Cuando sea necesario, únicamente se instalarán después de obtener el
        consentimiento del usuario.
      </p>

      <h3 className="text-base font-bold text-[#0B1D4D]">Cookies publicitarias</h3>
      <p>
        En caso de que Docentium utilice en el futuro tecnologías destinadas a
        mostrar publicidad personalizada o medir campañas publicitarias, se
        solicitará previamente el consentimiento correspondiente.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">3. Gestión del consentimiento</h2>
      <p>
        Cuando se utilicen cookies que requieran consentimiento, el usuario
        podrá aceptarlas, rechazarlas o configurar sus preferencias.
      </p>
      <p>
        La opción de aceptar y rechazar deberá ofrecerse con un nivel de
        visibilidad equivalente.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">4. Modificación de preferencias</h2>
      <p>
        El usuario podrá modificar sus preferencias de cookies en cualquier
        momento mediante el panel de configuración disponible en la web.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">5. Actualizaciones</h2>
      <p>
        Esta Política de Cookies podrá modificarse cuando cambien las
        tecnologías utilizadas o las obligaciones legales aplicables.
      </p>
    </LegalLayout>
  );
}
