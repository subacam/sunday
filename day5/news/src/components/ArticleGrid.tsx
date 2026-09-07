import type { NewsItem } from '@/types/news';
import ArticleCard from './ArticleCard';

export default function ArticleGrid({ items }: { items: NewsItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <ArticleCard key={`${item.link}-${i}`} item={item} />
      ))}
    </div>
  );
}
