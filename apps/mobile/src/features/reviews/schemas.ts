import { z } from 'zod';

export const reviewFormSchema = z.object({
  rating: z
    .number({ error: 'Vui lòng chọn số sao đánh giá' })
    .int()
    .min(1, 'Vui lòng chọn ít nhất 1 sao')
    .max(5, 'Số sao tối đa là 5 sao'),
  comment: z
    .string()
    .max(1000, 'Nội dung đánh giá không được vượt quá 1000 ký tự')
    .optional(),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
