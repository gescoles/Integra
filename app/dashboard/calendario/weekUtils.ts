export function getWeekStart(offsetWeeks: number): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay(); // 0=domingo, 1=lunes...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offsetWeeks * 7);
  return monday;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startStr = monday.toLocaleDateString("es-ES", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  });
  const endStr = sunday.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `${startStr} – ${endStr}`;
}
