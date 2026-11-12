/** `GET /availability` (docs/specs/bookings.md). Dates `yyyy-MM-dd` and times `HH:mm` are Vietnam local time (ADR-0003). */
export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface AvailableStaff {
  id: string;
  fullName: string;
  slots: readonly TimeSlot[];
}

export interface Availability {
  date: string;
  durationMinutes: number;
  staff: readonly AvailableStaff[];
}
