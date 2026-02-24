export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <header className="border-b border-border bg-surface/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="h-7 w-24 animate-pulse rounded-lg bg-surface-hover" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-hover" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Back link skeleton */}
        <div className="mb-8 h-4 w-16 animate-pulse rounded bg-surface-hover" />

        {/* Title skeleton */}
        <div className="mb-8 h-7 w-36 animate-pulse rounded-lg bg-surface-hover" />

        {/* Balance + subscription cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface p-6 space-y-3"
            >
              <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
              <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-hover" />
              <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
              <div className="h-9 w-full animate-pulse rounded-xl bg-surface-hover mt-2" />
            </div>
          ))}
        </div>

        {/* Projects section */}
        <div className="mb-4 h-5 w-28 animate-pulse rounded bg-surface-hover" />
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Transactions section */}
        <div className="mb-4 h-5 w-44 animate-pulse rounded bg-surface-hover" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-hover" />
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
      </main>
    </div>
  );
}
