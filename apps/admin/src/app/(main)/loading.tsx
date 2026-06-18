import { Skeleton } from "@ecom/ui/components/skeleton";

/**
 * Admin (main) loading fallback.
 * Shown while any page segment within the admin layout is loading.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-1 h-7 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-9 w-[120px] rounded-md" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-border">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_120px] gap-4 border-b border-border p-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
        {/* Rows */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_1fr_120px] gap-4 border-b border-border p-4 last:border-b-0"
          >
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-5" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
