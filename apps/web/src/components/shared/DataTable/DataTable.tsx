import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
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

const CARD_QUERY = '(max-width: 639px)';

/** Below `sm` a table needs sideways scrolling, so rows are shown as cards there instead. */
function useCardLayout() {
  const [cards, setCards] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(CARD_QUERY).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(CARD_QUERY);
    const onChange = () => setCards(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return cards;
}

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

  const cardLayout = useCardLayout();

  const handleRowKeyDown = (event: KeyboardEvent<HTMLElement>, row: TData) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  const pagination = page && onPageChange && !showError && (page.totalCount > 0 || !showEmpty) && (
    <DataTablePagination
      {...page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      disabled={isLoading || isFetching}
    />
  );

  if (cardLayout) {
    // Phone layout: the first column is the card title, the others are label/value pairs, actions sit top right.
    const [titleColumn, ...detailColumns] = columns;
    return (
      <div className={cn('flex flex-col', className)}>
        <div
          aria-busy={isLoading || isFetching || undefined}
          className={cn('transition-opacity', isFetching && !showSkeleton && 'opacity-60')}
        >
          <p className="sr-only">{caption}</p>
          {showSkeleton && (
            <ul className="space-y-3">
              {Array.from({ length: Math.min(skeletonRows, 4) }, (_, index) => (
                <li
                  key={`skeleton-${index}`}
                  data-testid="data-table-skeleton-row"
                  className="space-y-2 rounded-xl border bg-card p-4"
                >
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </li>
              ))}
            </ul>
          )}
          {showError && (
            <div className="rounded-xl border bg-card p-4">
              <ErrorState message={error ?? undefined} onRetry={onRetry} retrying={isFetching} />
            </div>
          )}
          {showEmpty && (
            <div className="rounded-xl border bg-card p-4">{empty ?? <EmptyState />}</div>
          )}
          {!showSkeleton && !showError && rows.length > 0 && (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li
                  key={getRowId(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    'space-y-3 rounded-xl border bg-card p-4 shadow-2xs',
                    onRowClick &&
                      'cursor-pointer transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row) : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-sm">{titleColumn?.cell(row)}</div>
                    {rowActions && (
                      <div className="-mt-1 -mr-2 shrink-0">
                        <DataTableRowActions row={row} actions={rowActions(row)} />
                      </div>
                    )}
                  </div>
                  {detailColumns.length > 0 && (
                    <dl className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3 gap-y-2 border-t pt-3 text-sm">
                      {detailColumns.map((column) => (
                        <div key={column.id} className="contents">
                          <dt className="text-xs leading-5 text-muted-foreground">
                            {column.header}
                          </dt>
                          <dd className="min-w-0 break-words">{column.cell(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {pagination}
      </div>
    );
  }

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
      {pagination}
    </div>
  );
}
