'use client';

import { useState, type FormEvent } from 'react';

interface SearchBarProps {
  initialValue: string;
  onSubmit: (query: string) => void;
  disabled: boolean;
}

/** Parent must pass `key={initialValue}` (or similar) — remounting is how this
 * resets when the committed query changes externally (chip click, URL init),
 * without a setState-in-effect anti-pattern for something that isn't really
 * "syncing with an external system". */
export default function SearchBar({ initialValue, onSubmit, disabled }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  const trimmed = value.trim();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex w-full gap-2">
      <label htmlFor="news-search-input" className="sr-only">
        뉴스 검색어
      </label>
      <input
        id="news-search-input"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="검색어를 입력하세요"
        className="min-h-11 w-full flex-1 rounded-md border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none focus:border-neutral-900 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !trimmed}
        className="min-h-11 min-w-11 shrink-0 rounded-md bg-neutral-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
      >
        검색
      </button>
    </form>
  );
}
