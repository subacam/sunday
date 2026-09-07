interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-6 py-16 text-center"
    >
      <p className="text-base text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
      >
        다시 시도
      </button>
    </div>
  );
}
