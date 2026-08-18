interface LoadMoreButtonProps {
  onClick: () => void;
  loading: boolean;
  visible: boolean;
}

export default function LoadMoreButton({ onClick, loading, visible }: LoadMoreButtonProps) {
  if (!visible) return null;
  return (
    <div className="flex justify-center pt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="min-h-11 min-w-32 rounded-md border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-700 hover:border-neutral-500 disabled:opacity-50"
      >
        {loading ? '불러오는 중...' : '더보기'}
      </button>
    </div>
  );
}
