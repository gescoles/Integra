"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type PlanCount = { name: string; value: number; color: string };

export function PlansDonut({ data }: { data: PlanCount[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-[180px] flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-[#0B1D4D]">0</span>
        <span className="mt-1 text-xs text-slate-400">
          Todavía no hay centros creados
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="relative mx-auto h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#0B1D4D]">{total}</span>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600">{entry.name}</span>
            </div>
            <span className="font-medium text-slate-500">
              {entry.value} ({total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
