import type { AssignedAppointmentStatus } from '@spa/shared-types';
import { addDays } from '@/lib/formatting/vietnamTime';

/** Tabs of SCR-W26; each one is a preset date range (Vietnam dates) and status. */
export const assignedTabs = ['today', 'upcoming', 'done'] as const;
export type AssignedTab = (typeof assignedTabs)[number];

export const assignedTabLabels: Record<AssignedTab, string> = {
  today: 'Hôm nay',
  upcoming: 'Sắp tới',
  done: 'Đã xong',
};

export const isAssignedTab = (value: string | null): value is AssignedTab =>
  (assignedTabs as readonly (string | null)[]).includes(value);

export interface AssignedPreset {
  from: string;
  to: string;
  status: AssignedAppointmentStatus | undefined;
}

/** Hôm nay: today; Sắp tới: tomorrow → today + 14; Đã xong: today − 30 → today, completed only. */
export function assignedPreset(tab: AssignedTab, today: string): AssignedPreset {
  switch (tab) {
    case 'upcoming':
      return { from: addDays(today, 1), to: addDays(today, 14), status: undefined };
    case 'done':
      return { from: addDays(today, -30), to: today, status: 'completed' };
    default:
      return { from: today, to: today, status: undefined };
  }
}
