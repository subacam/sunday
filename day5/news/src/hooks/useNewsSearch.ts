'use client';

import { useCallback, useRef, useState } from 'react';
import { MAX_PAGE } from '@/lib/constants';
import type { NewsApiError, NewsApiSuccess, NewsItem, SortOption } from '@/types/news';

interface LastRequest {
  query: string;
  sort: SortOption;
  page: number;
}

interface UseNewsSearchState {
  query: string;
  sort: SortOption;
  items: NewsItem[];
  total: number;
  currentPage: number;
  loading: boolean;
  showSkeleton: boolean;
  error: NewsApiError | null;
}

const INITIAL_STATE: UseNewsSearchState = {
  query: '',
  sort: 'sim',
  items: [],
  total: 0,
  currentPage: 0,
  loading: false,
  showSkeleton: false,
  error: null,
};

const GENERIC_ERROR: NewsApiError = {
  error: 'UPSTREAM_ERROR',
  message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

export function useNewsSearch() {
  const [state, setState] = useState<UseNewsSearchState>(INITIAL_STATE);

  const abortRef = useRef<AbortController | null>(null);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef<LastRequest | null>(null);

  const runFetch = useCallback(async (query: string, sort: SortOption, page: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    skeletonTimerRef.current = setTimeout(() => {
      setState((s) => ({ ...s, showSkeleton: true }));
    }, 300);

    lastRequestRef.current = { query, sort, page };
    setState((s) => ({ ...s, query, sort, loading: true, error: null }));

    try {
      const params = new URLSearchParams({ query, sort, page: String(page) });
      const res = await fetch(`/api/news?${params.toString()}`, { signal: controller.signal });
      const body = await res.json();

      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, showSkeleton: false, error: body as NewsApiError }));
        return;
      }

      const data = body as NewsApiSuccess;
      setState((s) => ({
        ...s,
        items: data.items,
        total: data.total,
        currentPage: data.currentPage,
        loading: false,
        showSkeleton: false,
        error: null,
      }));
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState((s) => ({ ...s, loading: false, showSkeleton: false, error: GENERIC_ERROR }));
    } finally {
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
        skeletonTimerRef.current = null;
      }
    }
  }, []);

  const search = useCallback(
    (query: string, sort: SortOption) => {
      const q = query.trim();
      if (!q) return;
      runFetch(q, sort, 1);
    },
    [runFetch],
  );

  /** Like `search`, but seeds an arbitrary starting page — used to restore
   * state from a shared/refreshed URL without replaying every page in between. */
  const init = useCallback(
    (query: string, sort: SortOption, page: number) => {
      const q = query.trim();
      if (!q) return;
      runFetch(q, sort, Math.max(1, page));
    },
    [runFetch],
  );

  const changeSort = useCallback(
    (sort: SortOption) => {
      if (!state.query) return;
      runFetch(state.query, sort, 1);
    },
    [runFetch, state.query],
  );

  const loadMore = useCallback(() => {
    if (state.loading) return;
    if (state.currentPage >= MAX_PAGE) return;
    if (state.items.length >= state.total) return;
    runFetch(state.query, state.sort, state.currentPage + 1);
  }, [runFetch, state.loading, state.currentPage, state.items.length, state.total, state.query, state.sort]);

  const retry = useCallback(() => {
    const last = lastRequestRef.current;
    if (!last) return;
    runFetch(last.query, last.sort, last.page);
  }, [runFetch]);

  const hasMore = state.currentPage < MAX_PAGE && state.items.length < state.total;

  return { ...state, hasMore, search, init, changeSort, loadMore, retry };
}
