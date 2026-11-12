import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AssignedAppointmentListParams, AssignedAppointmentStatus } from '@spa/shared-types';
import { vietnamNow } from '@/lib/formatting/vietnamTime';
import { assignedPreset, isAssignedTab, type AssignedTab } from '../assignedRange';
import { assignedFilterSchema } from '../schemas';

/** Statuses a staff member may filter by, in the order of the select. */
export const assignedStatuses: readonly AssignedAppointmentStatus[] = [
  'pending_confirmation',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
];

const isAssignedStatus = (value: string | null): value is AssignedAppointmentStatus =>
  (assignedStatuses as readonly (string | null)[]).includes(value);

export interface AssignedFiltersState {
  tab: AssignedTab;
  from: string;
  to: string;
  status: AssignedAppointmentStatus | undefined;
  /** Null while the range is invalid: nothing is sent. */
  params: AssignedAppointmentListParams | null;
  errors: { from?: string; to?: string };
  /** True when the filters differ from the tab's preset. */
  isCustom: boolean;
  setTab: (tab: AssignedTab) => void;
  setRange: (from: string, to: string) => void;
  setStatus: (status: AssignedAppointmentStatus | undefined) => void;
  reset: () => void;
}

/** SCR-W26 filters kept in the URL (`tab`, `from`, `to`, `status`); a tab change resets to its preset. */
export function useAssignedFilters(today: string = vietnamNow().date): AssignedFiltersState {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: AssignedTab = isAssignedTab(rawTab) ? rawTab : 'today';
  const preset = assignedPreset(tab, today);
  const from = searchParams.get('from') ?? preset.from;
  const to = searchParams.get('to') ?? preset.to;
  const rawStatus = searchParams.has('status')
    ? searchParams.get('status')
    : (preset.status ?? null);
  const status = isAssignedStatus(rawStatus) ? rawStatus : undefined;

  const { params, errors } = useMemo(() => {
    const parsed = assignedFilterSchema.safeParse({ from, to });
    if (parsed.success)
      return {
        params: { fromDate: from, toDate: to, ...(status ? { status } : {}) },
        errors: {},
      };
    const fieldErrors: { from?: string; to?: string } = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === 'from' || field === 'to') && !fieldErrors[field])
        fieldErrors[field] = issue.message;
    }
    return { params: null, errors: fieldErrors };
  }, [from, to, status]);

  const update = (changes: Record<string, string | null>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  return {
    tab,
    from,
    to,
    status,
    params,
    errors,
    isCustom: from !== preset.from || to !== preset.to || status !== preset.status,
    setTab: (next) =>
      update({ tab: next === 'today' ? null : next, from: null, to: null, status: null }),
    setRange: (nextFrom, nextTo) => update({ from: nextFrom, to: nextTo }),
    setStatus: (next) => update({ status: next ?? '' }),
    reset: () => update({ from: null, to: null, status: null }),
  };
}
