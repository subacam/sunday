import { Fragment } from 'react';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { parseNaverHighlights } from '@/lib/naverHtml';
import type { NewsItem } from '@/types/news';

function Highlighted({ raw }: { raw: string }) {
  const segments = parseNaverHighlights(raw);
  return (
    <>
      {segments.map((seg, i) =>
        seg.bold ? <strong key={i}>{seg.text}</strong> : <Fragment key={i}>{seg.text}</Fragment>,
      )}
    </>
  );
}

export default function ArticleCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <h3 className="text-base font-semibold leading-snug text-neutral-900">
        <Highlighted raw={item.title} />
      </h3>
      <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
        <Highlighted raw={item.description} />
      </p>
      <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-neutral-400">
        <span>{item.source}</span>
        <span aria-hidden="true">·</span>
        <time>{formatRelativeTime(item.pubDate)}</time>
      </div>
    </a>
  );
}
