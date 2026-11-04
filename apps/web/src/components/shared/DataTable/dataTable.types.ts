import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { SortDirection } from '@spa/shared-types';

/** Một cột của DataTable. Khai báo bằng object thường, không dùng ColumnDef của TanStack trực tiếp. */
export interface DataTableColumn<TData> {
  /** Định danh ổn định của cột (camelCase), dùng làm key. */
  id: string;
  /** Tiêu đề cột hiển thị (tiếng Việt). */
  header: string;
  /** Nội dung ô. Định dạng tiền/ngày/enum ở đây bằng helper trong `lib/formatting`. */
  cell: (row: TData) => ReactNode;
  /** Có giá trị thì cột sắp xếp được; giá trị được gửi lên server ở tham số `sortBy`. */
  sortKey?: string;
  align?: 'start' | 'center' | 'end';
  /** Ẩn cột dưới breakpoint này để bảng vẫn đọc được trên màn hình hẹp. */
  hideBelow?: 'sm' | 'md' | 'lg';
  /** Class cho cả `th` và `td`, thường là độ rộng (`w-32`) hoặc `whitespace-nowrap`. */
  className?: string;
}

export interface DataTableSort {
  sortBy: string;
  sortDirection: SortDirection;
}

/** Metadata phân trang, lấy thẳng từ `PagedResponse` của backend. */
export interface DataTablePage {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface DataTableRowAction<TData> {
  label: string;
  icon?: LucideIcon;
  onSelect: (row: TData) => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}
