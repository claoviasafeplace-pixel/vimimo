export default function ProjectLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <header className="border-b border-border bg-surface/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="h-7 w-24 animate-pulse rounded-lg bg-surface-hover" />
          <div className="flex items-center gap-3">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-hover" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Status bar skeleton */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-surface-hover" />
        </div>

        {/* Room cards skeleton */}
        <div className="grid gap-6 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface overflow-hidden"
            >
              <div className="aspect-[4/3] animate-pulse bg-surface-hover" />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-28 animate-pulse rounded bg-surface-hover" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-surface-hover" />
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      className="h-16 w-16 animate-pulse rounded-lg bg-surface-hover"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
