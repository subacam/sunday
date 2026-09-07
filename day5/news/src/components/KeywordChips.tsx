interface KeywordChipsProps {
  keywords: string[];
  activeKeyword: string | null;
  onSelect: (keyword: string) => void;
  disabled: boolean;
}

export default function KeywordChips({ keywords, activeKeyword, onSelect, disabled }: KeywordChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {keywords.map((kw) => {
        const active = kw === activeKeyword;
        return (
          <button
            key={kw}
            type="button"
            onClick={() => onSelect(kw)}
            disabled={disabled}
            aria-pressed={active}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
              active
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
            }`}
          >
            #{kw}
          </button>
        );
      })}
    </div>
  );
}
