import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập câu hỏi.')
    .max(1000, 'Câu hỏi tối đa 1000 ký tự.'),
});

export type AskQuestionFormValues = z.infer<typeof askQuestionSchema>;
