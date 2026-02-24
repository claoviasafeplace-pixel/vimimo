export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Welcome header skeleton */}
      <div className="mb-10">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-hover" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-hover" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-surface/40 p-5 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-hover" />
            </div>
            <div className="h-9 w-20 animate-pulse rounded-lg bg-surface-hover" />
            <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
          </div>
        ))}
      </div>

      {/* Projects section skeleton */}
      <div className="mb-10">
        <div className="flex justify-between mb-5">
          <div className="h-6 w-28 animate-pulse rounded bg-surface-hover" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-hover" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface overflow-hidden"
            >
              <div className="aspect-video animate-pulse bg-surface-hover" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions skeleton */}
      <div>
        <div className="mb-5 h-6 w-44 animate-pulse rounded bg-surface-hover" />
        <div className="rounded-2xl border border-border/60 bg-surface/40 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 border-b border-border/40 last:border-0"
            >
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-hover shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-hover" />
              </div>
              <div className="space-y-1.5 text-right">
                <div className="ml-auto h-4 w-10 animate-pulse rounded bg-surface-hover" />
                <div className="ml-auto h-3 w-16 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
