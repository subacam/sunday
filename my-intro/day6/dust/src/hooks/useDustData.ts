'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CITIES, DEFAULT_CITY } from '@/lib/constants';
import type { CityCode, DustApiError, DustApiSuccess } from '@/types/dust';

const VALID_CITY_CODES = new Set(CITIES.map((c) => c.code));

interface DustState {
  city: CityCode;
  data: DustApiSuccess | null;
  loading: boolean;
  showSkeleton: boolean;
  error: DustApiError | null;
}

function isValidCity(raw: string | null): raw is CityCode {
  return raw !== null && VALID_CITY_CODES.has(raw as CityCode);
}

export function useDustData() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didInit = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<DustState>({
    city: DEFAULT_CITY,
    data: null,
    loading: false,
    showSkeleton: false,
    error: null,
  });

  const runFetch = useCallback(async (city: CityCode) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    skeletonTimerRef.current = setTimeout(() => {
      setState((s) => (s.loading ? { ...s, showSkeleton: true } : s));
    }, 300);

    setState((s) => ({ ...s, city, loading: true, error: null }));

    try {
      const res = await fetch(`/api/dust?city=${encodeURIComponent(city)}`, {
        signal: controller.signal,
      });
      const body = await res.json();

      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, showSkeleton: false, error: body as DustApiError }));
        return;
      }

      setState((s) => ({
        ...s,
        loading: false,
        showSkeleton: false,
        data: body as DustApiSuccess,
        error: null,
      }));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setState((s) => ({
        ...s,
        loading: false,
        showSkeleton: false,
        error: { error: 'UPSTREAM_ERROR', message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      }));
    } finally {
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    }
  }, []);

  const select = useCallback(
    (city: CityCode) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('city', city);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      void runFetch(city);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runFetch],
  );

  const retry = useCallback(() => {
    void runFetch(state.city);
  }, [runFetch, state.city]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const fromUrl = searchParams.get('city');
    const initial = isValidCity(fromUrl) ? fromUrl : DEFAULT_CITY;
    void runFetch(initial as CityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, select, retry };
}
