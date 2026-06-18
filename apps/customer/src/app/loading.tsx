/**
 * Global loading fallback for customer app.
 * Shown while any page segment is loading (Suspense boundary).
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-6 rounded-xl border border-border p-6">
            <div className="h-[140px] w-[200px] shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1">
              <div className="mb-2 h-6 w-[70%] animate-pulse rounded bg-muted" />
              <div className="mb-1 h-4 w-[90%] animate-pulse rounded bg-muted" />
              <div className="mb-1 h-4 w-[80%] animate-pulse rounded bg-muted" />
              <div className="mt-4 h-4 w-[40%] animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
