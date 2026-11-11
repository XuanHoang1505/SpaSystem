import { z } from 'zod';

export const updateTreatmentSchema = z.object({
  goal: z
    .string()
    .max(2000, 'Mục tiêu tối đa 2000 ký tự.')
    .optional()
    .nullable()
    .or(z.literal('')),
  expectedEndDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('')),
  note: z
    .string()
    .max(2000, 'Ghi chú tối đa 2000 ký tự.')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type UpdateTreatmentFormValues = z.infer<typeof updateTreatmentSchema>;

export const assignStaffSchema = z.object({
  staffMemberId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type AssignStaffFormValues = z.infer<typeof assignStaffSchema>;

export const treatmentReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do.')
    .max(500, 'Lý do tối đa 500 ký tự.'),
});

export type TreatmentReasonFormValues = z.infer<typeof treatmentReasonSchema>;

export const updateSessionNoteSchema = z.object({
  note: z
    .string()
    .max(2000, 'Ghi chú tối đa 2000 ký tự.')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type UpdateSessionNoteFormValues = z.infer<typeof updateSessionNoteSchema>;
