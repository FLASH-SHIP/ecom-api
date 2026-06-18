"use client";

import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import type { ReactNode } from "react";

interface PageShellProps {
  /** Page heading rendered as `<h5>`. Omit when using DataTable's `pageTitle` prop. */
  title?: string;
  children: ReactNode;
  /** Action buttons displayed right-aligned in the header row. */
  headerActions?: ReactNode;
}

/**
 * Standard page layout shell for all admin DataTable pages.
 *
 * Renders the breadcrumb (auto-generated from pathname + nav config)
 * and the page title immediately, then slots in `children`.
 *
 * Pass `headerActions` to render buttons right-aligned next to the title —
 * the standard pattern (e.g. "+ Tạo mới", "Xuất dữ liệu", ...).
 *
 * ## Pattern
 * ```tsx
 * // page.tsx
 * "use client";
 * import dynamic from "next/dynamic";
 * import { PageShell } from "@admin/components/layout/PageShell";
 * import { DataTableSkeleton } from "@admin/components/data-table";
 *
 * const Content = dynamic(() => import("./FeatureContent"), {
 *   ssr: false,
 *   loading: () => <DataTableSkeleton />,
 * });
 *
 * export default function Page() {
 *   return (
 *     <PageShell title="Tên tính năng" headerActions={<Button>+ Tạo mới</Button>}>
 *       <Content />
 *     </PageShell>
 *   );
 * }
 * ```
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function PageShell({ title, children, headerActions }: PageShellProps) {
  return (
    <div className="flex flex-col gap-4">
      {title && (
        <>
          {/* Breadcrumb — auto-generated from pathname */}
          <PageBreadcrumb className="mb-2" />

          {/* Header row: title left, actions right */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h5 className="text-xl font-bold tracking-tight">{title}</h5>
            {headerActions && (
              <div className="flex items-center gap-2 flex-wrap">{headerActions}</div>
            )}
          </div>
        </>
      )}

      {/* Main content */}
      {children}
    </div>
  );
}
