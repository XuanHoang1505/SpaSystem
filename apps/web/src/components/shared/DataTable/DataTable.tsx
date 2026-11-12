import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { cn } from '@/lib/utils';
import { DataTablePagination } from './DataTablePagination';
import { DataTableRowActions } from './DataTableRowActions';
import type {
  DataTableColumn,
  DataTablePage,
  DataTableRowAction,
  DataTableSort,
} from './dataTable.types';

export interface DataTableProps<TData> {
  columns: readonly DataTableColumn<TData>[];
  /** Các dòng của trang hiện tại (`PagedResponse.items`). */
  data: readonly TData[] | undefined;
  /** Id ổn định từ dữ liệu, không dùng chỉ số mảng. */
  getRowId: (row: TData) => string;
  /** Tên bảng cho trình đọc màn hình. */
  caption: string;
  /** Lần tải đầu, chưa có dữ liệu: hiện skeleton. */
  isLoading?: boolean;
  /** Đang tải lại khi đã có dữ liệu (đổi trang, lọc): giữ dữ liệu cũ, làm mờ. */
  isFetching?: boolean;
  /** Thông điệp lỗi đã dịch; có giá trị thì bảng hiện trạng thái lỗi. */
  error?: string | null;
  onRetry?: () => void;
  /** Nội dung khi rỗng; mặc định là EmptyState chung. */
  empty?: ReactNode;
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  page?: DataTablePage;
  onPageChange?: (pageNumber: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  onRowClick?: (row: TData) => void;
  rowActions?: (row: TData) => readonly DataTableRowAction<TData>[];
  /** Số dòng skeleton; mặc định theo pageSize, tối đa 10. */
  loadingRowCount?: number;
  className?: string;
}

const ACTIONS_COLUMN_ID = '__actions';
const alignClass = { start: 'text-left', center: 'text-center', end: 'text-right' } as const;
// Viết đủ tên class để Tailwind quét được.
const hideBelowClass = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;

function columnClass<TData>(column: DataTableColumn<TData> | undefined) {
  if (!column) return 'w-12 text-right';
  return cn(
    alignClass[column.align ?? 'start'],
    column.hideBelow && hideBelowClass[column.hideBelow],
    column.className,
  );
}

/** Thứ tự bấm tiêu đề: chưa sắp xếp → tăng dần → giảm dần → bỏ sắp xếp. */
function nextSort(
  current: DataTableSort | null | undefined,
  sortKey: string,
): DataTableSort | null {
  if (current?.sortBy !== sortKey) return { sortBy: sortKey, sortDirection: 'asc' };
  return current.sortDirection === 'asc' ? { sortBy: sortKey, sortDirection: 'desc' } : null;
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  caption,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  empty,
  sort,
  onSortChange,
  page,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  onRowClick,
  rowActions,
  loadingRowCount,
  className,
}: DataTableProps<TData>) {
  const columnsById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<TData>();
    const defs = columns.map((column) =>
      helper.display({
        id: column.id,
        header: column.header,
        cell: (context) => column.cell(context.row.original),
      }),
    );
    if (rowActions) {
      defs.push(
        helper.display({
          id: ACTIONS_COLUMN_ID,
          header: () => <span className="sr-only">Thao tác</span>,
          cell: (context) => (
            <DataTableRowActions
              row={context.row.original}
              actions={rowActions(context.row.original)}
            />
          ),
        }),
      );
    }
    return defs;
  }, [columns, rowActions]);

  const rows = useMemo(() => (data ? [...data] : []), [data]);
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const columnCount = tableColumns.length;
  const showSkeleton = isLoading && rows.length === 0;
  const showError = !showSkeleton && Boolean(error);
  const showEmpty = !showSkeleton && !showError && rows.length === 0;
  const skeletonRows = loadingRowCount ?? Math.min(page?.pageSize ?? 5, 10);

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: TData) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        className={cn(
          'overflow-hidden rounded-lg border bg-card transition-opacity',
          isFetching && !showSkeleton && 'opacity-60',
        )}
      >
        <Table aria-busy={isLoading || isFetching || undefined}>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const column = columnsById.get(header.column.id);
                  const sortKey = column?.sortKey;
                  const sorted = sortKey && sort?.sortBy === sortKey ? sort.sortDirection : null;
                  const label = flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <TableHead
                      key={header.id}
                      className={cn('h-11 text-muted-foreground', columnClass(column))}
                      aria-sort={
                        sortKey
                          ? sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : 'none'
                          : undefined
                      }
                    >
                      {sortKey && onSortChange ? (
                        <button
                          type="button"
                          className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:text-foreground"
                          onClick={() => onSortChange(nextSort(sort, sortKey))}
                        >
                          {label}
                          {sorted === 'asc' ? (
                            <ArrowUpIcon className="size-3.5" aria-hidden="true" />
                          ) : sorted === 'desc' ? (
                            <ArrowDownIcon className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 opacity-50" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showSkeleton &&
              Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`} data-testid="data-table-skeleton-row">
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id} className={columnClass(columnsById.get(column.id))}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {showError && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="whitespace-normal">
                  <ErrorState
                    message={error ?? undefined}
                    onRetry={onRetry}
                    retrying={isFetching}
                  />
                </TableCell>
              </TableRow>
            )}
            {showEmpty && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="whitespace-normal">
                  {empty ?? <EmptyState />}
                </TableCell>
              </TableRow>
            )}
            {!showSkeleton &&
              !showError &&
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick ? (event) => handleRowKeyDown(event, row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={columnClass(columnsById.get(cell.column.id))}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      {page && onPageChange && !showError && (page.totalCount > 0 || !showEmpty) && (
        <DataTablePagination
          {...page}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
          disabled={isLoading || isFetching}
        />
      )}
    </div>
  );
}
