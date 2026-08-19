'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatHourLabel } from '@/lib/formatTime';
import type { HourlyPoint } from '@/types/dust';

export default function HourlyTrendChart({ hourly }: { hourly: HourlyPoint[] }) {
  const chartData = hourly.map((p) => ({
    time: formatHourLabel(p.dataTime),
    PM10: p.pm10Value,
    'PM2.5': p.pm25Value,
  }));

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
      <h2 className="text-sm font-medium text-neutral-700">최근 24시간 추이</h2>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12 }} unit="" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="PM10" stroke="#f97316" dot={false} connectNulls />
            <Line type="monotone" dataKey="PM2.5" stroke="#dc2626" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
