'use client';

import { useDustData } from '@/hooks/useDustData';
import CityChipList from '@/components/CityChipList';
import AirQualityCard from '@/components/AirQualityCard';
import HourlyTrendChart from '@/components/HourlyTrendChart';
import SkeletonCard from '@/components/SkeletonCard';
import ErrorState from '@/components/ErrorState';

export default function DustExplorer() {
  const { city, data, loading, showSkeleton, error, select, retry } = useDustData();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">도시별 미세먼지 조회</h1>
        <p className="mt-1 text-sm text-neutral-500">
          시/도를 선택하면 실시간 미세먼지·초미세먼지 농도와 최근 24시간 추이를 볼 수 있어요.
        </p>
      </header>

      <CityChipList selected={city} onSelect={select} disabled={loading} />

      <div className="mt-6 space-y-4">
        {error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : showSkeleton || !data ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <AirQualityCard data={data} />
            <HourlyTrendChart hourly={data.hourly} />
          </>
        )}
      </div>
    </main>
  );
}
