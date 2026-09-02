"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Send, PenLine, RotateCcw, Mail, Download, CheckCircle2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { SignaturePad } from "../expedientes/SignaturePad";
import {
  guardarPIDocumento,
  solicitarFirmasPI,
  firmarComoTutorPI,
  firmarComoDirectorPI,
  marcarFirmaFamiliaPI,
  marcarFirmaAlumnoPI,
  cerrarPIInternoPI,
  enviarPIAFamilia,
  reabrirPIDocumento,
  eliminarPIDocumento,
  obtenerPIDocumento,
} from "./piDocumento";

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

type Idioma = "CA" | "ES";
type Profesional = { tipo: string; marcado: boolean; nombre: string };
type Medida = { materia: string; medida: string };

type Datos = {
  cursoAcademico: string;
  nombreAlumno: string;
  estudiosEnCurso: string;
  fechaNacimiento: string;
  lugarNacimiento: string;
  fechaLlegadaCatalunya: string;
  tutorNombre: string;
  lenguaHabitual: string;
  planAnteriorSiNo: boolean;
  medidasRecibidas: string;
  repeticionCursoSiNo: boolean;
  repeticionCual: string;
  centrosAnteriores: string;
  fechaInicioPI: string;
  periodoValidez: string;
  otrasInfoInteres: string;
  motivoInformeNEE: boolean;
  motivoAvaluacioPsico: boolean;
  motivoAvaluacioInicial: boolean;
  motivoOrigenEstranger: boolean;
  motivoCAD: boolean;
  motivoCADPropuesta: string;
  motivoAltres: boolean;
  motivoAltresTexto: string;
  descripcionNecesidad: string;
  profesionales: Profesional[];
  medidasSoportes: Medida[];
  horarioPersonalizadoSiNo: boolean;
};

// Los 8 tipos de profesional/servicio son fijos (tal como el Word),
// solo se marca cuál interviene y quién es. Se guardan en el idioma
// elegido para el documento.
const PROFESIONALES_TIPO: Record<Idioma, string[]> = {
  CA: [
    "Orientador/a del centre",
    "Equip d'assessorament psicopedagògic (EAP)",
    "Serveis socials",
    "Centre de salut mental (CSMIJ) / CSMA / Altres",
    "Centre de recursos educatius per a deficients auditius (CREDA), visuals (CREDV), fisioterapeuta…",
    "Suports externs (centres de psicopedagogia, reforç escolar, activitats del pla educatiu d'entorn...)",
    "Beques/Ajuts",
    "Altres serveis",
  ],
  ES: [
    "Orientador/a del centro",
    "Equipo de asesoramiento psicopedagógico (EAP)",
    "Servicios sociales",
    "Centro de salud mental (CSMIJ) / CSMA / Otros",
    "Centro de recursos educativos para deficientes auditivos (CREDA), visuales (CREDV), fisioterapeuta…",
    "Apoyos externos (centros de psicopedagogía, refuerzo escolar, actividades del plan educativo de entorno...)",
    "Becas/Ayudas",
    "Otros servicios",
  ],
};

// Las 8 filas de "Mesures i suports" que ya vienen por defecto (tal
// como el Word de ejemplo) — se pueden editar y añadir/quitar más.
const MEDIDAS_POR_DEFECTO: Record<Idioma, Medida[]> = {
  CA: [
    { materia: "Totes", medida: "30 minuts extra a exàmens" },
    { materia: "Totes", medida: "Flexibilitat en entrega de treballs i tasques" },
    { materia: "Totes", medida: "Possibilitat de llegir les consignes escrites" },
    { materia: "Totes", medida: "Reduir textos o instruccions escrites. Aclarir textos que provoquin dubte." },
    { materia: "Totes", medida: "Donar suports visuals com vídeos o imatges" },
    { materia: "Totes", medida: "Flexibilitat per exposicions orals i lectura en veu alta" },
    { materia: "Totes", medida: "No descompta l'ortografia" },
    { materia: "Matèries de llengua", medida: "Menor penalització ortogràfica" },
  ],
  ES: [
    { materia: "Todas", medida: "30 minutos extra en exámenes" },
    { materia: "Todas", medida: "Flexibilidad en la entrega de trabajos y tareas" },
    { materia: "Todas", medida: "Posibilidad de leer las consignas escritas" },
    { materia: "Todas", medida: "Reducir textos o instrucciones escritas. Aclarar textos que generen duda." },
    { materia: "Todas", medida: "Dar apoyos visuales como vídeos o imágenes" },
    { materia: "Todas", medida: "Flexibilidad para exposiciones orales y lectura en voz alta" },
    { materia: "Todas", medida: "No descuenta la ortografía" },
    { materia: "Materias de lengua", medida: "Menor penalización ortográfica" },
  ],
};

// Las 4 provincias de Catalunya, para el desplegable de lugar de
// nacimiento — si es de fuera, se puede escribir a mano.
const PROVINCIAS_CATALUNYA = ["Barcelona", "Girona", "Lleida", "Tarragona"];

const TEXTOS: Record<Idioma, Record<string, string>> = {
  CA: {
    cursAcademic: "Curs acadèmic",
    seccio1: "1. Dades personals i acadèmiques",
    nomAlumne: "Nom i cognoms de l'alumne/a",
    estudisEnCurs: "Estudis en curs",
    dataNaixement: "Data de naixement",
    llocNaixement: "Lloc de naixement",
    dataArribada: "Data d'arribada a Catalunya",
    tutor: "Tutor/a (responsable del PI)",
    llengua: "Llengua d'ús habitual",
    dataInici: "Data d'inici del PI",
    periodeValidesa: "Període de validesa",
    planAnterior: "Ha estat objecte d'un pla individualitzat en cursos anteriors?",
    mesuresRebudes: "Tipus de mesures i suports rebuts fins a l'actualitat",
    repeticions: "Repeticions de curs",
    quin: "Quin/s",
    centresAnteriors: "Centres on ha estat matriculat anteriorment",
    altresInfo: "Altres informacions d'interès",
    justificacio: "Justificació de la necessitat",
    motivatPer: "Motivat per",
    infoNEE: "Informe de reconeixement de necessitats específiques de suport educatiu",
    avaluacioPsico: "Avaluació psicopedagògica",
    avaluacioInicial: "Resultat de l'avaluació inicial de l'alumne/a",
    origenEstranger: "Avaluació de l'alumne/a d'origen estranger amb necessitats derivades de la incorporació tardana",
    cad: "Decisió de la comissió d'atenció a la diversitat (CAD)",
    cadProposta: "A proposta de...",
    altres: "Altres",
    descripcioNecessitat: "Breu descripció de la necessitat d'elaboració del PI",
    seccio2: "2. Professionals i serveis que intervenen",
    quiIntervé: "Qui",
    propostaEducativa: "Proposta educativa — Mesures i suports per a l'alumne/a",
    materia: "Matèria",
    mesura: "Mesura o suport",
    horariPersonalitzat: "Necessitat d'horari personalitzat",
    altreForaCat: "Altre (fora de Catalunya)",
    provinciesCat: "Províncies CAT",
    guardar: "Guardar",
    solicitarFirmes: "Sol·licitar firmes",
    afegirFila: "Afegir fila",
    si: "SI",
    no: "NO",
  },
  ES: {
    cursAcademic: "Curso académico",
    seccio1: "1. Datos personales y académicos",
    nomAlumne: "Nombre y apellidos del alumno/a",
    estudisEnCurs: "Estudios en curso",
    dataNaixement: "Fecha de nacimiento",
    llocNaixement: "Lugar de nacimiento",
    dataArribada: "Fecha de llegada a Cataluña",
    tutor: "Tutor/a (responsable del PI)",
    llengua: "Lengua de uso habitual",
    dataInici: "Fecha de inicio del PI",
    periodeValidesa: "Periodo de validez",
    planAnterior: "¿Ha sido objeto de un plan individualizado en cursos anteriores?",
    mesuresRebudes: "Tipo de medidas y apoyos recibidos hasta la actualidad",
    repeticions: "Repeticiones de curso",
    quin: "Cuál/es",
    centresAnteriors: "Centros donde ha estado matriculado anteriormente",
    altresInfo: "Otras informaciones de interés",
    justificacio: "Justificación de la necesidad",
    motivatPer: "Motivado por",
    infoNEE: "Informe de reconocimiento de necesidades específicas de apoyo educativo",
    avaluacioPsico: "Evaluación psicopedagógica",
    avaluacioInicial: "Resultado de la evaluación inicial del alumno/a",
    origenEstranger: "Evaluación del alumno/a de origen extranjero con necesidades derivadas de la incorporación tardía",
    cad: "Decisión de la comisión de atención a la diversidad (CAD)",
    cadProposta: "A propuesta de...",
    altres: "Otros",
    descripcioNecessitat: "Breve descripción de la necesidad de elaboración del PI",
    seccio2: "2. Profesionales y servicios que intervienen",
    quiIntervé: "Quién",
    propostaEducativa: "Propuesta educativa — Medidas y apoyos para el alumno/a",
    materia: "Materia",
    mesura: "Medida o apoyo",
    horariPersonalitzat: "Necesidad de horario personalizado",
    altreForaCat: "Otro (fuera de Cataluña)",
    provinciesCat: "Provincias CAT",
    guardar: "Guardar",
    solicitarFirmes: "Solicitar firmas",
    afegirFila: "Añadir fila",
    si: "SÍ",
    no: "NO",
  },
};

function datosAFormData(datos: Datos, idioma: Idioma): FormData {
  const formData = new FormData();
  const simples: (keyof Datos)[] = [
    "cursoAcademico", "nombreAlumno", "estudiosEnCurso", "fechaNacimiento", "lugarNacimiento",
    "fechaLlegadaCatalunya", "tutorNombre", "lenguaHabitual", "medidasRecibidas", "repeticionCual",
    "centrosAnteriores", "fechaInicioPI", "periodoValidez", "otrasInfoInteres", "motivoCADPropuesta",
    "motivoAltresTexto", "descripcionNecesidad",
  ];
  simples.forEach((campo) => formData.set(campo, String(datos[campo] ?? "")));

  const booleanos: (keyof Datos)[] = [
    "planAnteriorSiNo", "repeticionCursoSiNo", "motivoInformeNEE", "motivoAvaluacioPsico",
    "motivoAvaluacioInicial", "motivoOrigenEstranger", "motivoCAD", "motivoAltres", "horarioPersonalizadoSiNo",
  ];
  booleanos.forEach((campo) => {
    if (datos[campo]) formData.set(campo, "on");
  });

  formData.set("idioma", idioma);
  formData.set("profesionales", JSON.stringify(datos.profesionales));
  formData.set("medidasSoportes", JSON.stringify(datos.medidasSoportes));
  return formData;
}

// Los campos que hacen falta sí o sí para guardar — se comprueban en el
// cliente antes de llamar al servidor, para avisar con un mensaje claro
// en vez de que salte un error de golpe.
function camposQueFaltan(datos: Datos, t: Record<string, string>): string[] {
  const faltan: string[] = [];
  if (!datos.cursoAcademico.trim()) faltan.push(t.cursAcademic);
  if (!datos.nombreAlumno.trim()) faltan.push(t.nomAlumne);
  if (!datos.estudiosEnCurso.trim()) faltan.push(t.estudisEnCurs);
  if (!datos.tutorNombre.trim()) faltan.push(t.tutor);
  return faltan;
}

function datosVacios(nombreAlumno: string, curso: string, tutorNombre: string, idioma: Idioma, cursoAcademicoCentro: string, fechaNacimientoAlumno: string): Datos {
  return {
    cursoAcademico: cursoAcademicoCentro,
    nombreAlumno,
    estudiosEnCurso: curso,
    fechaNacimiento: fechaNacimientoAlumno,
    lugarNacimiento: "",
    fechaLlegadaCatalunya: "",
    tutorNombre,
    lenguaHabitual: "",
    planAnteriorSiNo: false,
    medidasRecibidas: "",
    repeticionCursoSiNo: false,
    repeticionCual: "",
    centrosAnteriores: "",
    fechaInicioPI: "",
    periodoValidez: "",
    otrasInfoInteres: "",
    motivoInformeNEE: false,
    motivoAvaluacioPsico: false,
    motivoAvaluacioInicial: false,
    motivoOrigenEstranger: false,
    motivoCAD: false,
    motivoCADPropuesta: "",
    motivoAltres: false,
    motivoAltresTexto: "",
    descripcionNecesidad: "",
    profesionales: PROFESIONALES_TIPO[idioma].map((tipo) => ({ tipo, marcado: false, nombre: "" })),
    medidasSoportes: MEDIDAS_POR_DEFECTO[idioma].map((m) => ({ ...m })),
    horarioPersonalizadoSiNo: false,
  };
}

export function PIDocumentoPanel({
  alumnoPiId,
  alumnoNombre,
  alumnoCurso,
  tutorId,
  tutorNombreReal,
  fechaNacimientoAlumno,
  documentoId,
  currentUserId,
  esPsicopedagoga,
  esDirectorFijo,
  profesoresDelCentro,
  cursoAcademicoCentro,
}: {
  alumnoPiId: string;
  alumnoNombre: string;
  alumnoCurso: string;
  tutorId: string;
  tutorNombreReal: string;
  fechaNacimientoAlumno: string;
  documentoId: string | null;
  currentUserId: string;
  esPsicopedagoga: boolean;
  esDirectorFijo: boolean;
  profesoresDelCentro: { id: string; nombre: string }[];
  cursoAcademicoCentro: string;
}) {
  const router = useRouter();
  const esTutor = tutorId === currentUserId;
  const [cargando, setCargando] = useState(Boolean(documentoId));
  const [documento, setDocumento] = useState<any>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(!documentoId);
  const [iniciarCreacion, setIniciarCreacion] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [plegado, setPlegado] = useState(false);
  const [enviandoFirmas, setEnviandoFirmas] = useState(false);
  const [idiomaElegido, setIdiomaElegido] = useState<Idioma | null>(null);

  useEffect(() => {
    if (!documentoId) return;
    obtenerPIDocumento(documentoId).then((d) => {
      setDocumento(d);
      setCargando(false);
    });
  }, [documentoId]);

  // El id del documento no cambia cuando solo cambia su estado (firmar,
  // solicitar firmas, cerrar, etc.) — así que el useEffect de arriba no
  // se vuelve a disparar solo. Cada acción que cambie algo en el
  // servidor tiene que llamar a esto para que la pantalla se entere.
  async function recargarDocumento() {
    if (!documentoId) return;
    const d = await obtenerPIDocumento(documentoId);
    setDocumento(d);
  }

  if (!documentoId && !creandoNuevo) return null;

  if (!documentoId && creandoNuevo) {
    if (!esPsicopedagoga) {
      return <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400">Todavía no hay ninguna documentación del PI para este alumno.</p>;
    }
    if (!iniciarCreacion) {
      return (
        <button
          onClick={() => setIniciarCreacion(true)}
          className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
        >
          Crear documentación del PI
        </button>
      );
    }
    if (!idiomaElegido) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <button onClick={() => setIniciarCreacion(false)} className="mb-4 block text-xs font-semibold text-slate-400 hover:text-[#FD5249]">
            ← Volver
          </button>
          <p className="mb-4 text-sm font-semibold text-slate-700">¿En qué idioma quieres generar el PI?</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setIdiomaElegido("CA")} className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]">
              Català
            </button>
            <button onClick={() => setIdiomaElegido("ES")} className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]">
              Castellano
            </button>
          </div>
        </div>
      );
    }
    return (
      <PIDocumentoFormulario
        alumnoPiId={alumnoPiId}
        idioma={idiomaElegido}
        datosIniciales={datosVacios(alumnoNombre, alumnoCurso, tutorNombreReal, idiomaElegido, cursoAcademicoCentro, fechaNacimientoAlumno)}
        soloLectura={false}
        permiteSolicitarFirmas={false}
        profesoresDelCentro={profesoresDelCentro}
        onGuardado={() => router.refresh()}
        onCancelar={() => setIdiomaElegido(null)}
      />
    );
  }

  if (cargando || !documento) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-xs text-slate-400">Cargando...</p>;
  }

  const puedeEditar = esPsicopedagoga && documento.estado === "BORRADOR";
  const puedeFirmarTutor = esTutor && documento.estado === "PENDIENTE_TUTOR_DIRECTOR" && !documento.tutorFirmaFecha;
  const puedeFirmarDirector = esDirectorFijo && documento.estado === "PENDIENTE_TUTOR_DIRECTOR" && !documento.directorFirmaFecha;
  const puedeGestionarFamilia = esTutor && documento.estado === "PENDIENTE_FAMILIA";
  const puedeEnviar = esTutor && documento.estado === "LISTO_PARA_ENVIAR";
  const puedeReabrir = esPsicopedagoga && documento.estado === "CERRADO";
  const puedeDescargar = (esPsicopedagoga || esTutor || esDirectorFijo) && documento.estado === "CERRADO";

  const idiomaDoc: Idioma = documento.idioma === "ES" ? "ES" : "CA";
  const datosDesdeDocumento: Datos = {
    cursoAcademico: documento.cursoAcademico ?? "",
    nombreAlumno: documento.nombreAlumno ?? "",
    estudiosEnCurso: documento.estudiosEnCurso ?? "",
    fechaNacimiento: documento.fechaNacimiento ?? "",
    lugarNacimiento: documento.lugarNacimiento ?? "",
    fechaLlegadaCatalunya: documento.fechaLlegadaCatalunya ?? "",
    tutorNombre: documento.tutorNombre ?? "",
    lenguaHabitual: documento.lenguaHabitual ?? "",
    planAnteriorSiNo: Boolean(documento.planAnteriorSiNo),
    medidasRecibidas: documento.medidasRecibidas ?? "",
    repeticionCursoSiNo: Boolean(documento.repeticionCursoSiNo),
    repeticionCual: documento.repeticionCual ?? "",
    centrosAnteriores: documento.centrosAnteriores ?? "",
    fechaInicioPI: documento.fechaInicioPI ?? "",
    periodoValidez: documento.periodoValidez ?? "",
    otrasInfoInteres: documento.otrasInfoInteres ?? "",
    motivoInformeNEE: Boolean(documento.motivoInformeNEE),
    motivoAvaluacioPsico: Boolean(documento.motivoAvaluacioPsico),
    motivoAvaluacioInicial: Boolean(documento.motivoAvaluacioInicial),
    motivoOrigenEstranger: Boolean(documento.motivoOrigenEstranger),
    motivoCAD: Boolean(documento.motivoCAD),
    motivoCADPropuesta: documento.motivoCADPropuesta ?? "",
    motivoAltres: Boolean(documento.motivoAltres),
    motivoAltresTexto: documento.motivoAltresTexto ?? "",
    descripcionNecesidad: documento.descripcionNecesidad ?? "",
    profesionales: (documento.profesionales as Profesional[] | null) ?? PROFESIONALES_TIPO[idiomaDoc].map((tipo) => ({ tipo, marcado: false, nombre: "" })),
    medidasSoportes: (documento.medidasSoportes as Medida[] | null) ?? [],
    horarioPersonalizadoSiNo: Boolean(documento.horarioPersonalizadoSiNo),
  };

  async function handleEliminarPI() {
    setEliminando(true);
    try {
      await eliminarPIDocumento(documentoId as string);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setEliminando(false);
      setConfirmandoEliminar(false);
    }
  }

  // En BORRADOR, la psicopedagoga ve por defecto un resumen colapsado
  // (con Editar / Solicitar firmas / Eliminar), no el formulario entero
  // abierto — solo se abre al pulsar "Editar".
  if (documento.estado === "BORRADOR" && esPsicopedagoga && !modoEdicion) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setPlegado((v) => !v)} className="flex items-center gap-2 text-left">
            {plegado ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            <div>
              <p className="text-sm font-semibold text-slate-700">{documento.nombreAlumno || alumnoNombre}</p>
              <p className="text-xs text-slate-400">Curso {documento.cursoAcademico || "—"} · Borrador guardado</p>
            </div>
          </button>
          {!plegado && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setModoEdicion(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <PenLine className="h-3.5 w-3.5" /> Editar
            </button>
            <button
              disabled={enviandoFirmas}
              onClick={async () => {
                const faltan = camposQueFaltan(datosDesdeDocumento, TEXTOS[idiomaDoc]);
                if (faltan.length > 0) {
                  alert(`Faltan estos campos:\n- ${faltan.join("\n- ")}`);
                  return;
                }
                setEnviandoFirmas(true);
                try {
                  await solicitarFirmasPI(alumnoPiId, datosAFormData(datosDesdeDocumento, idiomaDoc));
                  await recargarDocumento();
                  router.refresh();
                  alert("Se ha enviado el PI al tutor y al equipo directivo para validar y firmar.");
                } catch (e) {
                  alert(e instanceof Error ? e.message : "No se pudo solicitar las firmas.");
                } finally {
                  setEnviandoFirmas(false);
                }
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {enviandoFirmas ? <ButtonSpinner /> : <Mail className="h-3.5 w-3.5" />} Solicitar firmas
            </button>
            {!confirmandoEliminar ? (
              <button onClick={() => setConfirmandoEliminar(true)} className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">¿Eliminar este PI?</span>
                <button onClick={handleEliminarPI} disabled={eliminando} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {eliminando ? <ButtonSpinner /> : "Sí, eliminar"}
                </button>
                <button onClick={() => setConfirmandoEliminar(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <EstadoYAcciones
        documento={documento}
        documentoId={documentoId as string}
        puedeFirmarTutor={puedeFirmarTutor}
        puedeFirmarDirector={puedeFirmarDirector}
        puedeGestionarFamilia={puedeGestionarFamilia}
        puedeEnviar={puedeEnviar}
        puedeReabrir={puedeReabrir}
        puedeDescargar={puedeDescargar}
        esTutorActual={esTutor}
        esDirectorActual={esDirectorFijo}
        puedeVerAmbasFirmas={esPsicopedagoga}
        onCambio={() => {
          recargarDocumento();
          router.refresh();
        }}
      />
      {esPsicopedagoga && !confirmandoEliminar && (
        <button onClick={() => setConfirmandoEliminar(true)} className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" /> Eliminar este PI
        </button>
      )}
      {confirmandoEliminar && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <span className="text-xs text-red-700">¿Seguro que quieres eliminar este PI? No se puede deshacer.</span>
          <button onClick={handleEliminarPI} disabled={eliminando} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {eliminando ? <ButtonSpinner /> : "Sí, eliminar"}
          </button>
          <button onClick={() => setConfirmandoEliminar(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
            Cancelar
          </button>
        </div>
      )}
      <PIDocumentoFormulario
        alumnoPiId={alumnoPiId}
        documentoId={documentoId}
        idioma={idiomaDoc}
        datosIniciales={datosDesdeDocumento}
        soloLectura={!puedeEditar}
        permiteSolicitarFirmas
        profesoresDelCentro={profesoresDelCentro}
        onGuardado={() => {
          setModoEdicion(false);
          recargarDocumento();
          router.refresh();
        }}
        onCancelar={modoEdicion ? () => setModoEdicion(false) : undefined}
      />
    </div>
  );
}

function EstadoYAcciones({
  documento,
  documentoId,
  puedeFirmarTutor,
  puedeFirmarDirector,
  puedeGestionarFamilia,
  puedeEnviar,
  puedeReabrir,
  puedeDescargar,
  esTutorActual,
  esDirectorActual,
  puedeVerAmbasFirmas,
  onCambio,
}: {
  documento: any;
  documentoId: string;
  puedeFirmarTutor: boolean;
  puedeFirmarDirector: boolean;
  puedeGestionarFamilia: boolean;
  puedeEnviar: boolean;
  puedeReabrir: boolean;
  puedeDescargar: boolean;
  esTutorActual: boolean;
  esDirectorActual: boolean;
  puedeVerAmbasFirmas: boolean;
  onCambio: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFamilia, setEmailFamilia] = useState("");
  const [emailAlumno, setEmailAlumno] = useState("");
  const [firmaTutorDataUrl, setFirmaTutorDataUrl] = useState<string | null>(null);
  const [firmaDirectorDataUrl, setFirmaDirectorDataUrl] = useState<string | null>(null);
  const [firmaFamiliaDataUrl, setFirmaFamiliaDataUrl] = useState<string | null>(null);
  const [firmaAlumnoDataUrl, setFirmaAlumnoDataUrl] = useState<string | null>(null);
  const [noQuiereFirmarFamilia, setNoQuiereFirmarFamilia] = useState(false);
  const [noQuiereFirmarAlumno, setNoQuiereFirmarAlumno] = useState(false);

  async function accion(fn: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await fn();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setPending(false);
    }
  }

  function handleEnviar() {
    if (!emailFamilia.trim()) {
      setError("Falta el correo de la familia — es obligatorio para enviar el PI.");
      return;
    }
    accion(async () => {
      const formData = new FormData();
      formData.set("emailFamilia", emailFamilia);
      formData.set("emailAlumno", emailAlumno);
      await enviarPIAFamilia(documentoId, formData);
    });
  }

  const tutorFirmado = Boolean(documento.tutorFirmaFecha);
  const directorFirmado = Boolean(documento.directorFirmaFecha);
  const familiaFirmada = Boolean(documento.firmaFamiliaFecha);
  const alumnoFirmado = Boolean(documento.firmaAlumnoFecha);
  const cerrado = documento.estado === "CERRADO";

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {/* Resumen de estados, siempre visible: quién ha firmado y si está abierto o cerrado */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tutorFirmado && directorFirmado ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
          <CheckCircle2 className="h-3.5 w-3.5" /> {tutorFirmado && directorFirmado ? "Firmado por Tutor y Director" : "Pendiente Tutor y Director"}
        </span>
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${familiaFirmada && alumnoFirmado ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
          <CheckCircle2 className="h-3.5 w-3.5" /> {familiaFirmada && alumnoFirmado ? "Firmado por Família y Alumno" : "Firma Família y Alumno"}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cerrado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-600"}`}>
          {cerrado ? "Cerrado" : "Abierto"}
        </span>
      </div>

      {/* Firma del tutor — solo se ve si puede firmar/ya firmó, o si es
          quien puede supervisar ambas firmas (psicopedagoga/director). Al
          director no le hace falta ver el proceso del tutor y viceversa. */}
      {(puedeVerAmbasFirmas || esTutorActual) && (
        <div className="mb-4 border-t border-slate-100 pt-4">
          {tutorFirmado ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-emerald-700">Firmado por el tutor</span>
              {documento.tutorFirmaImagen && <img src={documento.tutorFirmaImagen} alt="Firma del tutor" className="h-10 rounded border border-slate-100 bg-white" />}
              <span className="text-xs text-slate-400">{documento.tutorFirmaFecha ? new Date(documento.tutorFirmaFecha).toLocaleDateString("es-ES") : ""}</span>
            </div>
          ) : puedeFirmarTutor ? (
            <div className="w-full max-w-sm">
              <SignaturePad label="Firma del tutor" onChange={setFirmaTutorDataUrl} />
              <button
                onClick={() => firmaTutorDataUrl && accion(() => firmarComoTutorPI(documentoId, firmaTutorDataUrl))}
                disabled={pending || !firmaTutorDataUrl}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-40"
              >
                {pending ? <ButtonSpinner /> : <PenLine className="h-4 w-4" />} Guardar firma
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <Clock className="h-4 w-4 shrink-0" /> Pendiente la firma del tutor
            </div>
          )}
        </div>
      )}

      {/* Firma del director — misma lógica de visibilidad, en espejo. */}
      {(puedeVerAmbasFirmas || esDirectorActual) && (
        <div className="mb-4 border-t border-slate-100 pt-4">
          {directorFirmado ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-emerald-700">Firmado por el director</span>
              {documento.directorFirmaImagen && <img src={documento.directorFirmaImagen} alt="Firma del director" className="h-10 rounded border border-slate-100 bg-white" />}
              <span className="text-xs text-slate-400">{documento.directorFirmaFecha ? new Date(documento.directorFirmaFecha).toLocaleDateString("es-ES") : ""}</span>
            </div>
          ) : puedeFirmarDirector ? (
            <div className="w-full max-w-sm">
              <SignaturePad label="Firma del director" onChange={setFirmaDirectorDataUrl} />
              <button
                onClick={() => firmaDirectorDataUrl && accion(() => firmarComoDirectorPI(documentoId, firmaDirectorDataUrl))}
                disabled={pending || !firmaDirectorDataUrl}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-40"
              >
                {pending ? <ButtonSpinner /> : <PenLine className="h-4 w-4" />} Guardar firma
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <Clock className="h-4 w-4 shrink-0" /> Pendiente la firma del director
            </div>
          )}
        </div>
      )}

      {/* Firmas de família y alumno — las recoge el tutor en persona */}
      {(puedeGestionarFamilia || familiaFirmada || alumnoFirmado) && (
        <div className="mb-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div>
            {familiaFirmada ? (
              documento.firmaFamiliaRechazada ? (
                <span className="inline-block -rotate-3 rounded border-2 border-red-500 px-3 py-1 text-sm font-black uppercase tracking-wide text-red-600">
                  {documento.idioma === "ES" ? "No Firmado" : "No firmat"}
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-emerald-700">Firmado por la família</span>
                  {documento.firmaFamiliaImagen && <img src={documento.firmaFamiliaImagen} alt="Firma de la família" className="h-10 rounded border border-slate-100 bg-white" />}
                </div>
              )
            ) : puedeGestionarFamilia ? (
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input type="checkbox" checked={noQuiereFirmarFamilia} onChange={(e) => setNoQuiereFirmarFamilia(e.target.checked)} />
                  No quiere firmar
                </label>
                {!noQuiereFirmarFamilia && <SignaturePad label="Firma de la família" onChange={setFirmaFamiliaDataUrl} />}
                <button
                  onClick={() =>
                    (noQuiereFirmarFamilia || firmaFamiliaDataUrl) &&
                    accion(() => marcarFirmaFamiliaPI(documentoId, noQuiereFirmarFamilia ? null : firmaFamiliaDataUrl, noQuiereFirmarFamilia))
                  }
                  disabled={pending || (!noQuiereFirmarFamilia && !firmaFamiliaDataUrl)}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-40"
                >
                  {pending ? <ButtonSpinner /> : <PenLine className="h-4 w-4" />} {noQuiereFirmarFamilia ? "Guardar" : "Guardar firma"}
                </button>
              </div>
            ) : null}
          </div>
          <div>
            {alumnoFirmado ? (
              documento.firmaAlumnoRechazada ? (
                <span className="inline-block -rotate-3 rounded border-2 border-red-500 px-3 py-1 text-sm font-black uppercase tracking-wide text-red-600">
                  {documento.idioma === "ES" ? "No Firmado" : "No firmat"}
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-emerald-700">Firmado por el alumno</span>
                  {documento.firmaAlumnoImagen && <img src={documento.firmaAlumnoImagen} alt="Firma del alumno" className="h-10 rounded border border-slate-100 bg-white" />}
                </div>
              )
            ) : puedeGestionarFamilia ? (
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input type="checkbox" checked={noQuiereFirmarAlumno} onChange={(e) => setNoQuiereFirmarAlumno(e.target.checked)} />
                  No quiere firmar
                </label>
                {!noQuiereFirmarAlumno && <SignaturePad label="Firma del alumno/a" onChange={setFirmaAlumnoDataUrl} />}
                <button
                  onClick={() =>
                    (noQuiereFirmarAlumno || firmaAlumnoDataUrl) &&
                    accion(() => marcarFirmaAlumnoPI(documentoId, noQuiereFirmarAlumno ? null : firmaAlumnoDataUrl, noQuiereFirmarAlumno))
                  }
                  disabled={pending || (!noQuiereFirmarAlumno && !firmaAlumnoDataUrl)}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-40"
                >
                  {pending ? <ButtonSpinner /> : <PenLine className="h-4 w-4" />} {noQuiereFirmarAlumno ? "Guardar" : "Guardar firma"}
                </button>
              </div>
            ) : null}
          </div>
          {puedeGestionarFamilia && familiaFirmada && alumnoFirmado && (
            <div className="sm:col-span-2">
              <button onClick={() => accion(() => cerrarPIInternoPI(documentoId))} disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60">
                {pending ? <ButtonSpinner /> : <PenLine className="h-4 w-4" />} Cerrar PI
              </button>
            </div>
          )}
        </div>
      )}

      {/* Correos y envío final */}
      {puedeEnviar && (
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">Enviar PI a la familia y al alumno</p>
          <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Correo de la familia *</label>
              <input value={emailFamilia} onChange={(e) => setEmailFamilia(e.target.value)} type="email" placeholder="Obligatorio" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Correo del alumno</label>
              <input value={emailAlumno} onChange={(e) => setEmailAlumno(e.target.value)} type="email" placeholder="Opcional" className={inputClass} />
            </div>
          </div>
          <button onClick={handleEnviar} disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60">
            {pending ? <ButtonSpinner /> : <Send className="h-4 w-4" />} Enviar PI
          </button>
        </div>
      )}

      {puedeReabrir && (
        <button onClick={() => accion(() => reabrirPIDocumento(documentoId))} disabled={pending} className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          {pending ? <ButtonSpinner /> : <RotateCcw className="h-4 w-4" />} Reabrir para editar
        </button>
      )}
      {puedeDescargar && (
        <a
          href={`/api/psicopedagogia/pi-pdf/${documentoId}`}
          className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" /> Descargar PDF
        </a>
      )}
    </div>
  );
}

function PIDocumentoFormulario({
  alumnoPiId,
  documentoId,
  idioma,
  datosIniciales,
  soloLectura,
  permiteSolicitarFirmas,
  profesoresDelCentro,
  onGuardado,
  onCancelar,
}: {
  alumnoPiId: string;
  documentoId?: string | null;
  idioma: Idioma;
  datosIniciales: Datos;
  soloLectura: boolean;
  permiteSolicitarFirmas: boolean;
  profesoresDelCentro: { id: string; nombre: string }[];
  onGuardado: () => void;
  onCancelar?: () => void;
}) {
  const [datos, setDatos] = useState<Datos>(datosIniciales);
  const [pendingGuardar, setPendingGuardar] = useState(false);
  const [pendingSolicitar, setPendingSolicitar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yaGuardadoUnaVez, setYaGuardadoUnaVez] = useState(permiteSolicitarFirmas);
  const [lugarNacimientoOtro, setLugarNacimientoOtro] = useState(!PROVINCIAS_CATALUNYA.includes(datosIniciales.lugarNacimiento) && Boolean(datosIniciales.lugarNacimiento));
  const t = TEXTOS[idioma];

  function set<K extends keyof Datos>(campo: K, valor: Datos[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  async function handleGuardar() {
    const faltan = camposQueFaltan(datos, t);
    if (faltan.length > 0) {
      setError(`Faltan estos campos: ${faltan.join(", ")}.`);
      return;
    }
    setPendingGuardar(true);
    setError(null);
    try {
      await guardarPIDocumento(alumnoPiId, datosAFormData(datos, idioma));
      setYaGuardadoUnaVez(true);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPendingGuardar(false);
    }
  }

  async function handleSolicitarFirmas() {
    const faltan = camposQueFaltan(datos, t);
    if (faltan.length > 0) {
      setError(`Faltan estos campos: ${faltan.join(", ")}.`);
      return;
    }
    setPendingSolicitar(true);
    setError(null);
    try {
      await solicitarFirmasPI(alumnoPiId, datosAFormData(datos, idioma));
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo solicitar las firmas.");
    } finally {
      setPendingSolicitar(false);
    }
  }

  function handleCancelar() {
    setDatos(datosIniciales);
    setError(null);
    if (onCancelar) onCancelar();
  }

  const fieldset = soloLectura ? "pointer-events-none opacity-70" : "";
  const orientadorIndex = datos.profesionales.findIndex((p) => p.tipo === PROFESIONALES_TIPO[idioma][0]);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${fieldset}`}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#0B1D4D]">{t.cursAcademic}</h4>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">{idioma === "CA" ? "Català" : "Castellano"}</span>
      </div>
      <input value={datos.cursoAcademico} onChange={(e) => set("cursoAcademico", e.target.value)} className={`${inputClass} mb-5 max-w-xs`} placeholder="2026-2027" />

      <h4 className="mb-3 border-t border-slate-100 pt-4 text-sm font-bold text-[#0B1D4D]">{t.seccio1}</h4>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className={labelClass}>{t.nomAlumne}</label><input value={datos.nombreAlumno} onChange={(e) => set("nombreAlumno", e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>{t.estudisEnCurs}</label><input value={datos.estudiosEnCurso} onChange={(e) => set("estudiosEnCurso", e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>{t.dataNaixement}</label><input type="date" value={datos.fechaNacimiento} onChange={(e) => set("fechaNacimiento", e.target.value)} className={inputClass} /></div>
        <div>
          <label className={labelClass}>{t.llocNaixement}</label>
          {!lugarNacimientoOtro ? (
            <select
              value={PROVINCIAS_CATALUNYA.includes(datos.lugarNacimiento) ? datos.lugarNacimiento : ""}
              onChange={(e) => {
                if (e.target.value === "__OTRO__") {
                  setLugarNacimientoOtro(true);
                  set("lugarNacimiento", "");
                } else {
                  set("lugarNacimiento", e.target.value);
                }
              }}
              className={inputClass}
            >
              <option value="">Selecciona...</option>
              {PROVINCIAS_CATALUNYA.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="__OTRO__">{t.altreForaCat}</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input value={datos.lugarNacimiento} onChange={(e) => set("lugarNacimiento", e.target.value)} placeholder="Escribe el lugar" className={inputClass} />
              <button type="button" onClick={() => { setLugarNacimientoOtro(false); set("lugarNacimiento", ""); }} className="shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                {t.provinciesCat}
              </button>
            </div>
          )}
        </div>
        <div><label className={labelClass}>{t.dataArribada}</label><input type="date" value={datos.fechaLlegadaCatalunya} onChange={(e) => set("fechaLlegadaCatalunya", e.target.value)} className={inputClass} /></div>
        <div>
          <label className={labelClass}>{t.tutor}</label>
          <select value={datos.tutorNombre} onChange={(e) => set("tutorNombre", e.target.value)} className={inputClass}>
            <option value="">Selecciona...</option>
            {profesoresDelCentro.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
            {datos.tutorNombre && !profesoresDelCentro.some((p) => p.nombre === datos.tutorNombre) && (
              <option value={datos.tutorNombre}>{datos.tutorNombre}</option>
            )}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t.llengua}</label>
          <select value={datos.lenguaHabitual} onChange={(e) => set("lenguaHabitual", e.target.value)} className={inputClass}>
            <option value="">Selecciona...</option>
            <option value="Castellano">Castellano</option>
            <option value="Catalán">Catalán</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{t.dataInici}</label>
          <input type="date" value={datos.fechaInicioPI} onChange={(e) => set("fechaInicioPI", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{t.periodeValidesa}</label>
          <select value={datos.periodoValidez} onChange={(e) => set("periodoValidez", e.target.value)} className={inputClass}>
            <option value="">Selecciona...</option>
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={`${n} ${n === 1 ? "mes" : "meses"}`}>{n} {n === 1 ? "mes" : "meses"}</option>
            ))}
          </select>
        </div>
      </div>

      <SiNoToggle label={t.planAnterior} valor={datos.planAnteriorSiNo} onChange={(v) => set("planAnteriorSiNo", v)} siLabel={t.si} noLabel={t.no} />
      <div className="mb-3">
        <label className={labelClass}>{t.mesuresRebudes}</label>
        <textarea value={datos.medidasRecibidas} onChange={(e) => set("medidasRecibidas", e.target.value)} rows={2} className={inputClass} />
      </div>
      <SiNoToggle label={t.repeticions} valor={datos.repeticionCursoSiNo} onChange={(v) => set("repeticionCursoSiNo", v)} siLabel={t.si} noLabel={t.no} />
      {datos.repeticionCursoSiNo && (
        <div className="mb-3"><label className={labelClass}>{t.quin}</label><input value={datos.repeticionCual} onChange={(e) => set("repeticionCual", e.target.value)} className={inputClass} /></div>
      )}
      <div className="mb-3"><label className={labelClass}>{t.centresAnteriors}</label><input value={datos.centrosAnteriores} onChange={(e) => set("centrosAnteriores", e.target.value)} className={inputClass} /></div>
      <div className="mb-5"><label className={labelClass}>{t.altresInfo}</label><textarea value={datos.otrasInfoInteres} onChange={(e) => set("otrasInfoInteres", e.target.value)} rows={2} className={inputClass} /></div>

      <h4 className="mb-3 border-t border-slate-100 pt-4 text-sm font-bold text-[#0B1D4D]">{t.justificacio}</h4>
      <div className="mb-3 space-y-2">
        <p className={labelClass}>{t.motivatPer}</p>
        <Checkbox label={t.infoNEE} checked={datos.motivoInformeNEE} onChange={(v) => set("motivoInformeNEE", v)} />
        <Checkbox label={t.avaluacioPsico} checked={datos.motivoAvaluacioPsico} onChange={(v) => set("motivoAvaluacioPsico", v)} />
        <Checkbox label={t.avaluacioInicial} checked={datos.motivoAvaluacioInicial} onChange={(v) => set("motivoAvaluacioInicial", v)} />
        <Checkbox label={t.origenEstranger} checked={datos.motivoOrigenEstranger} onChange={(v) => set("motivoOrigenEstranger", v)} />
        <Checkbox label={t.cad} checked={datos.motivoCAD} onChange={(v) => set("motivoCAD", v)} />
        {datos.motivoCAD && <input value={datos.motivoCADPropuesta} onChange={(e) => set("motivoCADPropuesta", e.target.value)} placeholder={t.cadProposta} className={`${inputClass} ml-6`} />}
        <Checkbox label={t.altres} checked={datos.motivoAltres} onChange={(v) => set("motivoAltres", v)} />
        {datos.motivoAltres && <input value={datos.motivoAltresTexto} onChange={(e) => set("motivoAltresTexto", e.target.value)} className={`${inputClass} ml-6`} />}
      </div>
      <div className="mb-5"><label className={labelClass}>{t.descripcioNecessitat}</label><textarea value={datos.descripcionNecesidad} onChange={(e) => set("descripcionNecesidad", e.target.value)} rows={2} className={inputClass} /></div>

      <h4 className="mb-3 border-t border-slate-100 pt-4 text-sm font-bold text-[#0B1D4D]">{t.seccio2}</h4>
      <div className="mb-5 space-y-2">
        {datos.profesionales.map((p, i) => (
          <div key={p.tipo} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2.5">
            <input
              type="checkbox"
              checked={p.marcado}
              onChange={(e) => {
                const copia = [...datos.profesionales];
                copia[i] = { ...copia[i], marcado: e.target.checked };
                set("profesionales", copia);
              }}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="text-sm text-slate-600">{p.tipo}</p>
              {p.marcado && i === orientadorIndex && (
                <select
                  value={p.nombre}
                  onChange={(e) => {
                    const copia = [...datos.profesionales];
                    copia[i] = { ...copia[i], nombre: e.target.value };
                    set("profesionales", copia);
                  }}
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">{t.quiIntervé}...</option>
                  {profesoresDelCentro.map((prof) => (
                    <option key={prof.id} value={prof.nombre}>{prof.nombre}</option>
                  ))}
                </select>
              )}
              {p.marcado && i !== orientadorIndex && (
                <input
                  value={p.nombre}
                  onChange={(e) => {
                    const copia = [...datos.profesionales];
                    copia[i] = { ...copia[i], nombre: e.target.value };
                    set("profesionales", copia);
                  }}
                  placeholder={t.quiIntervé}
                  className={`${inputClass} mt-1.5`}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <h4 className="mb-3 border-t border-slate-100 pt-4 text-sm font-bold text-[#0B1D4D]">{t.propostaEducativa}</h4>
      <ListaEditable
        items={datos.medidasSoportes}
        soloLectura={soloLectura}
        onChange={(items) => set("medidasSoportes", items as Medida[])}
        columnas={[{ key: "materia", placeholder: t.materia }, { key: "medida", placeholder: t.mesura }]}
        nuevo={{ materia: "", medida: "" }}
        afegirLabel={t.afegirFila}
      />
      <SiNoToggle label={t.horariPersonalitzat} valor={datos.horarioPersonalizadoSiNo} onChange={(v) => set("horarioPersonalizadoSiNo", v)} siLabel={t.si} noLabel={t.no} />

      {!soloLectura && (
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
          {onCancelar && (
            <button onClick={handleCancelar} disabled={pendingGuardar || pendingSolicitar} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60">
              Cancelar
            </button>
          )}
          <button onClick={handleGuardar} disabled={pendingGuardar || pendingSolicitar} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
            {pendingGuardar ? <ButtonSpinner /> : t.guardar}
          </button>
          <button
            onClick={handleSolicitarFirmas}
            disabled={pendingGuardar || pendingSolicitar || !yaGuardadoUnaVez}
            title={!yaGuardadoUnaVez ? "Primero guarda el documento" : undefined}
            className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-40"
          >
            {pendingSolicitar ? <ButtonSpinner /> : <Mail className="h-4 w-4" />} {t.solicitarFirmes}
          </button>
        </div>
      )}
    </div>
  );
}
function SiNoToggle({ label, valor, onChange, siLabel, noLabel }: { label: string; valor: boolean; onChange: (v: boolean) => void; siLabel: string; noLabel: string }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onChange(true)} className={`rounded-md px-3 py-1 text-xs font-semibold ${valor ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>{siLabel}</button>
        <button type="button" onClick={() => onChange(false)} className={`rounded-md px-3 py-1 text-xs font-semibold ${!valor ? "bg-slate-500 text-white" : "bg-slate-100 text-slate-500"}`}>{noLabel}</button>
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      {label}
    </label>
  );
}

function ListaEditable({
  items,
  soloLectura,
  onChange,
  columnas,
  nuevo,
  afegirLabel,
}: {
  items: any[];
  soloLectura: boolean;
  onChange: (items: any[]) => void;
  columnas: { key: string; placeholder: string }[];
  nuevo: Record<string, string>;
  afegirLabel: string;
}) {
  return (
    <div className="mb-5 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {columnas.map((c) => (
            <input
              key={c.key}
              value={item[c.key] ?? ""}
              placeholder={c.placeholder}
              onChange={(e) => {
                const copia = [...items];
                copia[i] = { ...copia[i], [c.key]: e.target.value };
                onChange(copia);
              }}
              className={inputClass}
            />
          ))}
          {!soloLectura && (
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {!soloLectura && (
        <button type="button" onClick={() => onChange([...items, nuevo])} className="flex items-center gap-1.5 text-xs font-semibold text-[#FD5249]">
          <Plus className="h-3.5 w-3.5" /> {afegirLabel}
        </button>
      )}
    </div>
  );
}
