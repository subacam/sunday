'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useNewsSearch } from '@/hooks/useNewsSearch';
import { POPULAR_KEYWORDS } from '@/lib/constants';
import type { SortOption } from '@/types/news';
import ArticleGrid from './ArticleGrid';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import KeywordChips from './KeywordChips';
import LoadMoreButton from './LoadMoreButton';
import SearchBar from './SearchBar';
import SkeletonGrid from './SkeletonGrid';
import SortToggle from './SortToggle';

export default function NewsExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    query,
    sort,
    items,
    total,
    currentPage,
    loading,
    showSkeleton,
    error,
    hasMore,
    search,
    init,
    changeSort,
    loadMore,
    retry,
  } = useNewsSearch();

  const listTopRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  const updateUrl = useCallback(
    (q: string, s: SortOption, page: number) => {
      const params = new URLSearchParams({ q, sort: s, page: String(page) });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname],
  );

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const q = searchParams.get('q');
    const s: SortOption = searchParams.get('sort') === 'date' ? 'date' : 'sim';
    const p = Number(searchParams.get('page')) || 1;
    if (q && q.trim()) init(q, s, p);
    // Only ever run once, on mount — reacting to searchParams here would
    // fight the router.replace calls this component makes itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(q: string) {
    search(q, sort);
    updateUrl(q, sort, 1);
  }

  function handleChipSelect(keyword: string) {
    search(keyword, sort);
    updateUrl(keyword, sort, 1);
  }

  function handleSortChange(next: SortOption) {
    if (!query) return;
    changeSort(next);
    updateUrl(query, next, 1);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleLoadMore() {
    loadMore();
    updateUrl(query, sort, currentPage + 1);
  }

  const hasSearched = query !== '';
  const showFullError = !!error && items.length === 0;
  const showEmpty = hasSearched && !loading && !error && items.length === 0;
  const showResults = items.length > 0;
  const showInlineError = !!error && showResults;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-neutral-900">뉴스 검색</h1>
        <p className="text-sm text-neutral-500">네이버 뉴스 검색 API 기반</p>
      </header>

      <div className="flex flex-col gap-3">
        <SearchBar key={query} initialValue={query} onSubmit={handleSubmit} disabled={loading} />
        <KeywordChips
          keywords={POPULAR_KEYWORDS}
          activeKeyword={hasSearched ? query : null}
          onSelect={handleChipSelect}
          disabled={loading}
        />
      </div>

      <div ref={listTopRef} className="flex scroll-mt-6 flex-col gap-4">
        {hasSearched && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              <strong className="text-neutral-900">&apos;{query}&apos;</strong> 검색 결과{' '}
              {total.toLocaleString()}건
            </p>
            <SortToggle value={sort} onChange={handleSortChange} disabled={loading} />
          </div>
        )}

        {showSkeleton && <SkeletonGrid />}

        {!showSkeleton && showFullError && <ErrorState message={error!.message} onRetry={retry} />}

        {!showSkeleton && showEmpty && (
          <EmptyState query={query} keywords={POPULAR_KEYWORDS} onSelectKeyword={handleChipSelect} />
        )}

        {!showSkeleton && showResults && (
          <>
            <ArticleGrid items={items} />
            {showInlineError && <ErrorState message={error!.message} onRetry={retry} />}
            <LoadMoreButton onClick={handleLoadMore} loading={loading} visible={hasMore && !showInlineError} />
          </>
        )}
      </div>
    </div>
  );
}
