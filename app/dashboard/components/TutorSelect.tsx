"use client";

import { useEffect, useState } from "react";
import { obtenerProfesoresParaTutor, esUsuarioActualDirectivo } from "../gruposActions";

export function TutorSelect({ name = "tutorId", defaultValue = "" }: { name?: string; defaultValue?: string }) {
  const [esDirectivo, setEsDirectivo] = useState(false);
  const [profesores, setProfesores] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [valor, setValor] = useState(defaultValue);

  useEffect(() => {
    Promise.all([esUsuarioActualDirectivo(), obtenerProfesoresParaTutor()])
      .then(([directivo, lista]) => {
        setEsDirectivo(directivo);
        setProfesores(lista);
      })
      .finally(() => setCargando(false));
  }, []);

  // Mientras carga, o si es un Profesor (que siempre es tutor de sí
  // mismo y no necesita elegir nada), no se muestra nada.
  if (cargando || !esDirectivo) return null;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tutor/a asignado/a</label>
      <select
        name={name}
        required
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
      >
        <option value="" disabled>
          Selecciona un profesor...
        </option>
        {profesores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
