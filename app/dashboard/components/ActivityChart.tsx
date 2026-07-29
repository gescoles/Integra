"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const data = [
  { day: "18 May", value: 78 },
  { day: "19 May", value: 95 },
  { day: "20 May", value: 108 },
  { day: "21 May", value: 82 },
  { day: "22 May", value: 148 },
  { day: "23 May", value: 138 },
  { day: "24 May", value: 195 },
];

export function ActivityChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={{ stroke: "#EEF2F7" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #EEF2F7",
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#2F6FED"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#2F6FED" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
