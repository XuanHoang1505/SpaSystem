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
