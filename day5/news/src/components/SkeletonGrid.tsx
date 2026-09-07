import { PAGE_SIZE } from '@/lib/constants';
import SkeletonCard from './SkeletonCard';

export default function SkeletonGrid({ count = PAGE_SIZE }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="뉴스를 불러오는 중"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
