import KeywordChips from './KeywordChips';

interface EmptyStateProps {
  query: string;
  keywords: string[];
  onSelectKeyword: (keyword: string) => void;
}

export default function EmptyState({ query, keywords, onSelectKeyword }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center">
      <p className="text-base text-neutral-600">
        <strong className="font-semibold text-neutral-900">&apos;{query}&apos;</strong>에 대한 검색 결과가
        없습니다.
      </p>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-neutral-500">다른 키워드로 검색해보세요</p>
        <KeywordChips keywords={keywords} activeKeyword={null} onSelect={onSelectKeyword} disabled={false} />
      </div>
    </div>
  );
}
