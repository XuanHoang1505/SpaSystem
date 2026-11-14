import { z } from 'zod';

export const bookingNoteSchema = z
  .string()
  .trim()
  .max(500, 'Ghi chú không được vượt quá 500 ký tự.');

export const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do hủy lịch hẹn.')
    .max(500, 'Lý do hủy không được vượt quá 500 ký tự.'),
});

export type CancelAppointmentFormValues = z.infer<typeof cancelAppointmentSchema>;

export const quickCancellationReasons = [
  'Bận việc đột xuất',
  'Muốn đổi sang ngày khác',
  'Đặt nhầm dịch vụ hoặc khung giờ',
  'Thay đổi kế hoạch cá nhân',
] as const;
