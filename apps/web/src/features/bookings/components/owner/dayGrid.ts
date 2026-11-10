import type { AppointmentListItem, AppointmentStatus } from '@spa/shared-types';

export const toMinutes = (time: string): number => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export interface DayColumn {
  staffId: string;
  fullName: string;
  appointments: readonly AppointmentListItem[];
}

/** Working staff (by name) plus staff that only appear in appointments; with staffFilter only that column. */
export function buildColumns(
  staff: readonly { id: string; fullName: string }[],
  appointments: readonly AppointmentListItem[],
  staffFilter?: string,
): DayColumn[] {
  const staffMap = new Map<string, { id: string; fullName: string }>();

  // Sort working staff by name
  const sortedStaff = [...staff].sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  for (const s of sortedStaff) {
    staffMap.set(s.id, s);
  }

  // Find staff appearing only in appointments
  const extraStaff: { id: string; fullName: string }[] = [];
  for (const appt of appointments) {
    if (!staffMap.has(appt.staff.id)) {
      const extra = { id: appt.staff.id, fullName: appt.staff.fullName };
      staffMap.set(appt.staff.id, extra);
      extraStaff.push(extra);
    }
  }
  extraStaff.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));

  let allStaff = [...sortedStaff, ...extraStaff];

  if (staffFilter) {
    allStaff = allStaff.filter((s) => s.id === staffFilter);
  }

  return allStaff.map((s) => ({
    staffId: s.id,
    fullName: s.fullName,
    appointments: appointments.filter((a) => a.staff.id === s.id),
  }));
}

/** Appointments drawn on the grid (not cancelled, not hold_expired) and the rest, both in server order. */
export function splitByGrid(appointments: readonly AppointmentListItem[]): {
  onGrid: AppointmentListItem[];
  cancelled: AppointmentListItem[];
} {
  const onGrid: AppointmentListItem[] = [];
  const cancelled: AppointmentListItem[] = [];

  for (const a of appointments) {
    if (a.status === 'cancelled' || a.status === 'hold_expired') {
      cancelled.push(a);
    } else {
      onGrid.push(a);
    }
  }

  return { onGrid, cancelled };
}

/** Grid range: policy start/end widened to whole steps so every onGrid appointment fits. */
export function gridRange(
  onGrid: readonly AppointmentListItem[],
  start: string,
  end: string,
  step: number,
): { startMinutes: number; endMinutes: number; slots: string[] } {
  const defaultStart = toMinutes(start);
  const defaultEnd = toMinutes(end);

  let startMinutes = defaultStart;
  let endMinutes = defaultEnd;

  if (onGrid.length > 0) {
    const minStart = Math.min(...onGrid.map((a) => toMinutes(a.startTime)));
    const maxEnd = Math.max(...onGrid.map((a) => toMinutes(a.endTime)));
    startMinutes = Math.min(defaultStart, Math.floor(minStart / step) * step);
    endMinutes = Math.max(defaultEnd, Math.ceil(maxEnd / step) * step);
  }

  const slots: string[] = [];
  for (let m = startMinutes; m < endMinutes; m += step) {
    slots.push(fromMinutes(m));
  }

  return { startMinutes, endMinutes, slots };
}

/** Row placement by minute (1 row = 5 minutes) and a lane when cards of one column overlap. */
export function placeCard(
  appointment: AppointmentListItem,
  column: readonly AppointmentListItem[],
  startMinutes: number,
): { rowStart: number; rowSpan: number; lane: number; laneCount: number } {
  const apptStart = toMinutes(appointment.startTime);
  const apptEnd = toMinutes(appointment.endTime);
  const rowStart = Math.floor((apptStart - startMinutes) / 5) + 1;
  const rowSpan = Math.max(1, Math.floor((apptEnd - apptStart) / 5));

  // Compute lane assignment for column
  // 1. Sort column by start time then end time
  const sorted = [...column].sort((a, b) => {
    const diff = toMinutes(a.startTime) - toMinutes(b.startTime);
    if (diff !== 0) return diff;
    return toMinutes(a.endTime) - toMinutes(b.endTime);
  });

  // 2. Group into connected overlapping clusters
  const clusters: AppointmentListItem[][] = [];
  for (const item of sorted) {
    if (clusters.length === 0) {
      clusters.push([item]);
      continue;
    }
    const currentCluster = clusters[clusters.length - 1];
    if (currentCluster) {
      const maxEnd = Math.max(...currentCluster.map((c) => toMinutes(c.endTime)));
      if (toMinutes(item.startTime) < maxEnd) {
        currentCluster.push(item);
      } else {
        clusters.push([item]);
      }
    }
  }

  // 3. Within the cluster containing appointment, greedily assign lanes
  let lane = 0;
  let laneCount = 1;

  for (const cluster of clusters) {
    if (cluster.some((c) => c.id === appointment.id)) {
      const laneEndTimes: number[] = [];
      const laneMap = new Map<string, number>();

      for (const item of cluster) {
        const itemStart = toMinutes(item.startTime);
        const itemEnd = toMinutes(item.endTime);

        let placedLane = -1;
        for (let l = 0; l < laneEndTimes.length; l++) {
          const laneEnd = laneEndTimes[l];
          if (laneEnd !== undefined && laneEnd <= itemStart) {
            placedLane = l;
            laneEndTimes[l] = itemEnd;
            break;
          }
        }

        if (placedLane === -1) {
          placedLane = laneEndTimes.length;
          laneEndTimes.push(itemEnd);
        }

        laneMap.set(item.id, placedLane);
      }

      lane = laneMap.get(appointment.id) ?? 0;
      laneCount = laneEndTimes.length;
      break;
    }
  }

  return { rowStart, rowSpan, lane, laneCount };
}

// Drag & drop types and pure helpers
export type DropTarget = { staffId: string; startTime: string };

export type DropCommand =
  { kind: 'reschedule'; startTime: string } | { kind: 'assign_staff'; staffMemberId: string };

export const dropId = (target: DropTarget): string => `${target.staffId}|${target.startTime}`;

export const parseDropId = (id: string): DropTarget | null => {
  const idx = id.indexOf('|');
  if (idx === -1) return null;
  const staffId = id.slice(0, idx);
  const startTime = id.slice(idx + 1);
  if (!staffId || !/^\d{2}:\d{2}$/.test(startTime)) return null;
  return { staffId, startTime };
};

export const isDraggable = (status: AppointmentStatus): boolean =>
  status === 'pending_confirmation' || status === 'confirmed';

/**
 * Another column → assign_staff (the time is ignored: one drop changes one thing).
 * Same column, another start → reschedule, unless start + duration would pass 24:00. Otherwise null.
 */
export function resolveDrop(
  appointment: AppointmentListItem,
  target: DropTarget | null,
): DropCommand | null {
  if (!target) return null;

  if (target.staffId !== appointment.staff.id) {
    return { kind: 'assign_staff', staffMemberId: target.staffId };
  }

  if (target.startTime === appointment.startTime) {
    return null;
  }

  const duration = toMinutes(appointment.endTime) - toMinutes(appointment.startTime);
  const newEnd = toMinutes(target.startTime) + duration;
  if (newEnd > 24 * 60) {
    return null;
  }

  return { kind: 'reschedule', startTime: target.startTime };
}
