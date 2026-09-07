import { CITIES } from '@/lib/constants';
import type { CityCode } from '@/types/dust';

interface Props {
  selected: CityCode;
  onSelect: (city: CityCode) => void;
  disabled: boolean;
}

export default function CityChipList({ selected, onSelect, disabled }: Props) {
  return (
    <div role="group" aria-label="시/도 선택" className="flex flex-wrap gap-2">
      {CITIES.map((city) => {
        const isSelected = city.code === selected;
        return (
          <button
            key={city.code}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onSelect(city.code)}
            className={`min-h-11 min-w-11 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isSelected
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-100'
            }`}
          >
            {city.name}
          </button>
        );
      })}
    </div>
  );
}
