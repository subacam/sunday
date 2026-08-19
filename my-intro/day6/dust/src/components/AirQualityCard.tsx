import GradeBadge from '@/components/GradeBadge';
import { formatMeasuredTime } from '@/lib/formatTime';
import type { DustApiSuccess } from '@/types/dust';

function formatValue(v: number | null): string {
  return v === null ? '-' : `${v}`;
}

export default function AirQualityCard({ data }: { data: DustApiSuccess }) {
  const { current, station } = data;
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{station} 측정소</p>
        <GradeBadge grade={current.khaiGrade} />
      </div>

      <div className="mt-4 flex gap-8">
        <div>
          <p className="text-xs text-neutral-500">미세먼지 PM10</p>
          <p className="text-2xl font-semibold">
            {formatValue(current.pm10Value)}
            <span className="ml-1 text-sm font-normal text-neutral-500">㎍/㎥</span>
          </p>
          <div className="mt-1">
            <GradeBadge grade={current.pm10Grade} />
          </div>
        </div>
        <div>
          <p className="text-xs text-neutral-500">초미세먼지 PM2.5</p>
          <p className="text-2xl font-semibold">
            {formatValue(current.pm25Value)}
            <span className="ml-1 text-sm font-normal text-neutral-500">㎍/㎥</span>
          </p>
          <div className="mt-1">
            <GradeBadge grade={current.pm25Grade} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-neutral-400">{formatMeasuredTime(current.dataTime)}</p>
    </div>
  );
}
