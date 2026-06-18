/**
 * Reusable loading skeletons for admin dashboard.
 * Uses shadcn Skeleton + Tailwind CSS.
 */

import { Skeleton } from "@ecom/ui/components/skeleton";

export { Skeleton };

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex gap-4 border-b border-border px-6 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
          <Skeleton key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
          key={`r-${ri}`}
          className={`flex gap-4 px-6 py-4 ${ri < rows - 1 ? "border-b border-border" : ""}`}
        >
          {Array.from({ length: cols }).map((_, ci) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
            <Skeleton key={`c-${ci}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <Skeleton className="mb-4 h-5 w-1/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
          <StatCardSkeleton key={`stat-${i}`} />
        ))}
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}
