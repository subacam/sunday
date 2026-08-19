export default function SkeletonCard() {
  return (
    <div role="status" aria-label="불러오는 중" className="animate-pulse rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
      <div className="h-4 w-24 rounded bg-neutral-200" />
      <div className="mt-4 flex gap-6">
        <div className="h-10 w-20 rounded bg-neutral-200" />
        <div className="h-10 w-20 rounded bg-neutral-200" />
      </div>
      <div className="mt-4 h-6 w-16 rounded-full bg-neutral-200" />
      <div className="mt-4 h-3 w-40 rounded bg-neutral-200" />
    </div>
  );
}
