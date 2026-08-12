import { LegalLayout } from "../components/LegalLayout";

export default function AvisoLegalPage() {
  return (
    <LegalLayout titulo="Aviso legal" actualizado="agosto de 2026">
      <p>
        En cumplimiento de la legislación aplicable a los servicios de la
        sociedad de la información, se facilita la siguiente información
        relativa al titular de Docentium.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">1. Titular del sitio web</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <tbody>
            {[
              ["Nombre comercial", "Docentium"],
              ["Titular", "Jass R"],
              ["NIF/CIF", "4616****E"],
              ["Domicilio", "Carrer Plini el Vell"],
              ["Correo electrónico", "gescoles@gmail.com"],
              ["Sitio web", "https://doc3ntium.vercel.app/"],
            ].map(([label, value]) => (
              <tr key={label} className="border-b border-slate-100 last:border-0">
                <td className="w-40 bg-slate-50 px-4 py-2.5 font-semibold text-slate-500">{label}</td>
                <td className="px-4 py-2.5 text-slate-700">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        En caso de que el proyecto sea gestionado posteriormente por una
        sociedad mercantil, estos datos serán sustituidos por los
        correspondientes a dicha entidad.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">2. Finalidad</h2>
      <p>
        Docentium es una plataforma tecnológica orientada a facilitar la
        gestión y coordinación de procesos internos en centros educativos.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">3. Condiciones de utilización</h2>
      <p>
        El usuario se compromete a utilizar este sitio web de conformidad
        con la legislación vigente, la buena fe y los presentes términos.
      </p>
      <p>
        No se permite utilizar el sitio con fines ilícitos o que puedan
        causar daños a Docentium, sus usuarios o terceros.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">4. Propiedad intelectual e industrial</h2>
      <p>
        Todos los contenidos propios de Docentium, incluyendo diseños,
        logotipos, interfaces, textos, elementos gráficos y software, están
        protegidos por la normativa aplicable.
      </p>
      <p>
        Su utilización no supone la cesión de ningún derecho de propiedad
        intelectual o industrial.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">5. Enlaces externos</h2>
      <p>El sitio web podrá incluir enlaces a páginas de terceros.</p>
      <p>
        Docentium no controla necesariamente dichos sitios y no se
        responsabiliza de sus contenidos, políticas o servicios.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">6. Responsabilidad</h2>
      <p>
        Docentium adoptará medidas razonables para mantener actualizada y
        disponible la información publicada.
      </p>
      <p>
        No obstante, no puede garantizar la ausencia absoluta de errores,
        interrupciones o problemas técnicos.
      </p>

      <h2 className="pt-2 text-lg font-bold text-[#0B1D4D]">7. Legislación aplicable</h2>
      <p>
        El presente aviso legal se regirá por la legislación española, sin
        perjuicio de las normas imperativas que puedan resultar aplicables.
      </p>
    </LegalLayout>
  );
}
