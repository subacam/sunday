export default function SkeletonCard() {
  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-5">
      <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
      <div className="h-3 w-full animate-pulse rounded bg-neutral-200" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-200" />
      <div className="mt-auto h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
    </div>
  );
}
