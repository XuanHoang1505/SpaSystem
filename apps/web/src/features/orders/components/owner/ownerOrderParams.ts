import type { OrderSearchParams, OrderSortBy, OrderStatus } from '@spa/shared-types';
import type { DataTableSort } from '@/components/shared/DataTable';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending_payment',
  'paid',
  'expired',
  'cancelled',
];

const SORT_KEYS: readonly OrderSortBy[] = ['createdAtUtc', 'grandTotal'];

/** A status from the URL, or `undefined` when it is not one the API knows. */
export const toOrderStatus = (value: string): OrderStatus | undefined =>
  ORDER_STATUSES.find((status) => status === value);

const toSortBy = (value: string): OrderSortBy | undefined => SORT_KEYS.find((key) => key === value);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A `yyyy-MM-dd` date from the URL, or `undefined` for anything else. */
const toDate = (value: string): string | undefined => (DATE.test(value) ? value : undefined);

interface OrderTableState {
  pageNumber: number;
  pageSize: number;
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
  sort: DataTableSort | null;
}

/** The query of `GET /orders` from the table state on the URL; a reversed date range sends neither end. */
export function buildOrderSearchParams(state: OrderTableState): {
  params: OrderSearchParams;
  dateRangeInvalid: boolean;
} {
  const fromDate = toDate(state.fromDate);
  const toDateValue = toDate(state.toDate);
  const dateRangeInvalid = Boolean(fromDate && toDateValue && fromDate > toDateValue);
  const sortBy = state.sort ? toSortBy(state.sort.sortBy) : undefined;
  const params: OrderSearchParams = { pageNumber: state.pageNumber, pageSize: state.pageSize };
  const search = state.search.trim();
  if (search) params.search = search;
  const status = toOrderStatus(state.status);
  if (status) params.status = status;
  if (!dateRangeInvalid && fromDate) params.fromDate = fromDate;
  if (!dateRangeInvalid && toDateValue) params.toDate = toDateValue;
  if (sortBy && state.sort) {
    params.sortBy = sortBy;
    params.sortDirection = state.sort.sortDirection;
  }
  return { params, dateRangeInvalid };
}
