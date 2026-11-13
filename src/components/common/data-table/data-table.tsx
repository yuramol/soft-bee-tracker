import type { ReactNode } from 'react';

import { ErrorState } from '@components/common/error-state/error-state';
import { TableSkeleton } from '@components/common/loading-state/skeletons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/types/api-error';

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  emptyState,
  renderMobileRow,
  className
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton columns={Math.min(columns.length, 5)} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('animate-in fade-in duration-500', className)}>
      {renderMobileRow ? (
        <ul className='flex flex-col gap-3 md:hidden'>
          {rows.map((row) => (
            <li key={getRowId(row)} className='bg-card rounded-2xl border p-4'>
              {renderMobileRow(row)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className={cn('bg-card overflow-hidden rounded-2xl border', renderMobileRow && 'hidden md:block')}>
        <Table>
          <TableHeader className='bg-muted/50'>
            <TableRow className='hover:bg-transparent'>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn('text-muted-foreground h-11 px-4 text-xs font-medium uppercase', column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={cn('px-4 py-3', column.className)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: ApiError | null;
  onRetry?: () => void;
  emptyState: ReactNode;
  renderMobileRow?: (row: T) => ReactNode;
  className?: string;
}
