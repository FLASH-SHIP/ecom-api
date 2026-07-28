import { Skeleton } from "./skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

interface TableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  hasHeader?: boolean;
  hasCheckbox?: boolean;
  hasActions?: boolean;
  className?: string;
}

export function TableSkeleton({
  columnCount = 5,
  rowCount = 5,
  hasHeader = true,
  hasCheckbox = false,
  hasActions = false,
  className,
}: TableSkeletonProps) {
  // Array of column keys
  const cols = Array.from({ length: columnCount }, (_, i) => `col-${i}`);
  // Array of row keys
  const rows = Array.from({ length: rowCount }, (_, i) => `row-${i}`);

  return (
    <div className={className}>
      <Table>
        {hasHeader && (
          <TableHeader>
            <TableRow>
              {hasCheckbox && (
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              )}
              {cols.map((colKey) => (
                <TableHead key={colKey}>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
              {hasActions && (
                <TableHead className="w-24 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {rows.map((rowKey, rowIndex) => (
            <TableRow key={rowKey}>
              {hasCheckbox && (
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
              )}
              {cols.map((colKey, colIndex) => {
                // Vary width of cells to look more realistic
                const widths = ["w-2/3", "w-1/2", "w-5/6", "w-3/4", "w-11/12"];
                const widthClass = widths[(rowIndex + colIndex) % widths.length];
                return (
                  <TableCell key={`${rowKey}-${colKey}`}>
                    <Skeleton className={`h-4 ${widthClass}`} />
                  </TableCell>
                );
              })}
              {hasActions && (
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-20 ml-auto rounded-md" />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
