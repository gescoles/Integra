"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

export function SignaturePad({
  label,
  onChange,
}: {
  label: string;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujandoRef = useRef(false);
  const ultimaPosRef = useRef<{ x: number; y: number } | null>(null);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0B1D4D";
    }
  }, []);

  function getPos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function empezar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    dibujandoRef.current = true;
    ultimaPosRef.current = getPos(canvas, e);
  }

  function mover(e: React.MouseEvent | React.TouchEvent) {
    if (!dibujandoRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !ultimaPosRef.current) return;

    const pos = getPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(ultimaPosRef.current.x, ultimaPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ultimaPosRef.current = pos;
    if (vacio) setVacio(false);
  }

  function terminar() {
    dibujandoRef.current = false;
    ultimaPosRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && !vacio) onChange(canvas.toDataURL("image/png"));
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVacio(true);
    onChange(null);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <button type="button" onClick={limpiar} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-600">
          <Eraser className="h-3 w-3" /> Borrar
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-28 w-full touch-none rounded-lg border border-slate-200 bg-slate-50"
        onMouseDown={empezar}
        onMouseMove={mover}
        onMouseUp={terminar}
        onMouseLeave={terminar}
        onTouchStart={empezar}
        onTouchMove={mover}
        onTouchEnd={terminar}
      />
      {vacio && <p className="mt-1 text-[11px] text-slate-400">Firma aquí con el ratón o el dedo</p>}
    </div>
  );
}
