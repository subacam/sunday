import type { SortOption } from '@/types/news';

interface SortToggleProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
  disabled: boolean;
}

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'sim', label: '정확도순' },
  { value: 'date', label: '최신순' },
];

export default function SortToggle({ value, onChange, disabled }: SortToggleProps) {
  return (
    <div role="radiogroup" aria-label="정렬 기준" className="inline-flex rounded-md border border-neutral-300 p-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`min-h-11 rounded px-3 text-sm font-medium disabled:opacity-50 ${
              active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
