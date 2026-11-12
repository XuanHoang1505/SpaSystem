import { z } from 'zod';

export const CANCEL_APPOINTMENT_REASON_MAX = 500;

/** Reason to cancel an appointment: required, 1-500 characters after trimming (docs/specs/bookings.md, A2). */
export const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do hủy.')
    .max(CANCEL_APPOINTMENT_REASON_MAX, `Lý do hủy tối đa ${CANCEL_APPOINTMENT_REASON_MAX} ký tự.`),
});

export type CancelAppointmentValues = z.input<typeof cancelAppointmentSchema>;

/** The owner's cancel reason (UC-SPA-17): the same rule and messages as the customer's. */
export const ownerCancelSchema = cancelAppointmentSchema;

export const NO_SHOW_NOTE_MAX = 1000;

/** Optional note when the customer did not come: trimmed, at most 1000 characters. */
export const noShowSchema = z.object({
  note: z
    .string()
    .trim()
    .max(NO_SHOW_NOTE_MAX, `Ghi chú tối đa ${NO_SHOW_NOTE_MAX} ký tự.`)
    .optional(),
});

export type NoShowValues = z.input<typeof noShowSchema>;
