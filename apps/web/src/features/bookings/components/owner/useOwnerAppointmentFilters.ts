import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AppointmentListParams, AppointmentStatus } from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { addDays, vietnamNow } from '@/lib/formatting/vietnamTime';
import { isAppointmentStatus } from '../../appointmentStatus';

export type OwnerAppointmentsViewMode = 'list' | 'day';

export interface OwnerAppointmentFiltersState {
  view: OwnerAppointmentsViewMode;
  fromDate: string;
  toDate: string;
  date: string;
  staffMemberId?: string;
  status?: AppointmentStatus;
  search: string;
  rangeError: string | null;
  listParams: AppointmentListParams | null;
  dayParams: AppointmentListParams;
  appointmentId: string | null;
  hasFilters: boolean;
  pageNumber: number;
  pageSize: number;
  setView: (view: OwnerAppointmentsViewMode) => void;
  setRange: (from: string, to: string) => void;
  setDate: (date: string) => void;
  setStaff: (id: string | null) => void;
  setStatus: (status: AppointmentStatus | null) => void;
  setSearch: (text: string) => void;
  setPage: (page: number, opts?: { replace?: boolean }) => void;
  setPageSize: (size: number) => void;
  openAppointment: (id: string) => void;
  closeAppointment: () => void;
  reset: () => void;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidDate(val: string | null | undefined): val is string {
  if (!val || !DATE_REGEX.test(val)) return false;
  return addDays(val, 0) === val;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function useOwnerAppointmentFilters(today?: string): OwnerAppointmentFiltersState {
  const [searchParams, setSearchParams] = useSearchParams();
  const table = useTableSearchParams({
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  });

  const todayDate = today ?? vietnamNow().date;
  const defaultFromDate = todayDate;
  const defaultToDate = addDays(todayDate, 6);

  const view: OwnerAppointmentsViewMode = searchParams.get('view') === 'day' ? 'day' : 'list';

  const rawFromDate = searchParams.get('fromDate');
  const rawToDate = searchParams.get('toDate');

  let fromDate = defaultFromDate;
  let toDate = defaultToDate;

  if (isValidDate(rawFromDate) && isValidDate(rawToDate) && rawFromDate <= rawToDate) {
    fromDate = rawFromDate;
    toDate = rawToDate;
  }

  const diff = daysBetween(fromDate, toDate) + 1;
  const rangeError =
    diff > catalogPolicies.maxAppointmentQueryRangeDays ? 'Chỉ xem tối đa 42 ngày một lần' : null;

  const rawDate = searchParams.get('date');
  const date = isValidDate(rawDate) ? rawDate : todayDate;

  const rawStaff = searchParams.get('staffMemberId');
  const staffMemberId = rawStaff && GUID_REGEX.test(rawStaff) ? rawStaff : undefined;

  const rawStatus = searchParams.get('status');
  const status = rawStatus && isAppointmentStatus(rawStatus) ? rawStatus : undefined;

  const rawAppointmentId = searchParams.get('appointmentId');
  const appointmentId =
    rawAppointmentId && GUID_REGEX.test(rawAppointmentId) ? rawAppointmentId : null;

  const search = table.search;

  const listParams: AppointmentListParams | null = rangeError
    ? null
    : {
        fromDate,
        toDate,
        staffMemberId,
        status,
        search: search || undefined,
        pageNumber: table.pageNumber,
        pageSize: table.pageSize,
      };

  const dayParams: AppointmentListParams = {
    fromDate: date,
    toDate: date,
    staffMemberId,
    status,
    search: search || undefined,
    pageNumber: 1,
    pageSize: 100,
  };

  const hasFilters = Boolean(
    (search && search.trim() !== '') ||
    staffMemberId !== undefined ||
    status !== undefined ||
    (rawFromDate && rawFromDate !== defaultFromDate) ||
    (rawToDate && rawToDate !== defaultToDate) ||
    (rawDate && rawDate !== todayDate) ||
    rangeError !== null,
  );

  const setView = useCallback(
    (nextView: OwnerAppointmentsViewMode) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextView === 'list') next.delete('view');
        else next.set('view', 'day');
        return next;
      });
    },
    [setSearchParams],
  );

  const setRange = useCallback(
    (from: string, to: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('fromDate', from);
        next.set('toDate', to);
        next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const setDate = useCallback(
    (nextDate: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('date', nextDate);
        return next;
      });
    },
    [setSearchParams],
  );

  const setStaff = useCallback(
    (id: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set('staffMemberId', id);
        else next.delete('staffMemberId');
        next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const setStatus = useCallback(
    (nextStatus: AppointmentStatus | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextStatus) next.set('status', nextStatus);
        else next.delete('status');
        next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const openAppointment = useCallback(
    (id: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('appointmentId', id);
        return next;
      });
    },
    [setSearchParams],
  );

  const closeAppointment = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('appointmentId');
      return next;
    });
  }, [setSearchParams]);

  const reset = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams();
      if (prev.get('view') === 'day') next.set('view', 'day');
      return next;
    });
  }, [setSearchParams]);

  return {
    view,
    fromDate,
    toDate,
    date,
    staffMemberId,
    status,
    search,
    rangeError,
    listParams,
    dayParams,
    appointmentId,
    hasFilters,
    pageNumber: table.pageNumber,
    pageSize: table.pageSize,
    setView,
    setRange,
    setDate,
    setStaff,
    setStatus,
    setSearch: table.setSearch,
    setPage: table.setPage,
    setPageSize: table.setPageSize,
    openAppointment,
    closeAppointment,
    reset,
  };
}
