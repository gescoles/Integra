"use client";

import { useEffect, useState } from "react";

export function NowIndicator({
  hourStart,
  hourEnd,
  rowHeight,
}: {
  hourStart: number;
  hourEnd: number;
  rowHeight: number;
}) {
  const [minutesNow, setMinutesNow] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
      setMinutesNow((now.getHours() - hourStart) * 60 + now.getMinutes());
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [hourStart]);

  if (minutesNow === null) return null;

  const totalMinutes = (hourEnd - hourStart) * 60;
  if (minutesNow < 0 || minutesNow > totalMinutes) return null;

  const top = (minutesNow / 60) * rowHeight;

  return (
    <>
      {/* Difuminado de las horas ya pasadas */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 bg-slate-400/10"
        style={{ height: top }}
      />
      {/* Línea de la hora actual */}
      <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top }}>
        <div className="h-[2px] bg-red-500" />
        <div className="absolute -left-1 -top-[5px] h-3 w-3 rounded-full bg-red-500" />
      </div>
    </>
  );
}
