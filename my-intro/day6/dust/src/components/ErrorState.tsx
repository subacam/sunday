import type { DustApiError } from '@/types/dust';

export default function ErrorState({ error, onRetry }: { error: DustApiError; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm text-red-700">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        다시 시도
      </button>
    </div>
  );
}
