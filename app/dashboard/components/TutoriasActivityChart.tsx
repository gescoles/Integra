"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Point = {
  day: string;
  nuevas: number;
  seguimiento: number;
  completadas: number;
  pendientes: number;
};

export function TutoriasActivityChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={{ stroke: "#EEF2F7" }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EEF2F7", fontSize: 12 }} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => {
            const labels: Record<string, string> = {
              nuevas: "Nuevas tutorías",
              seguimiento: "En seguimiento",
              completadas: "Completadas",
              pendientes: "Pendientes",
            };
            return labels[value] ?? value;
          }}
        />
        <Line type="monotone" dataKey="nuevas" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="seguimiento" stroke="#2F6FED" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="completadas" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="pendientes" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
