import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập câu hỏi.')
    .max(1000, 'Câu hỏi tối đa 1000 ký tự.'),
});

export type AskQuestionFormValues = z.infer<typeof askQuestionSchema>;

export const GUEST_QUICK_PROMPTS = [
  'Tư vấn dịch vụ cho da nhạy cảm',
  'Các gói cấp ẩm phục hồi da',
  'Bảng giá dịch vụ chăm sóc da',
  'Cách đặt lịch hẹn tại spa',
] as const;

export const CUSTOMER_QUICK_PROMPTS = [
  'Lịch hẹn sắp tới của tôi',
  'Gói của tôi còn bao nhiêu buổi?',
  'Tư vấn dịch vụ cho da nhạy cảm',
  'Các gói cấp ẩm phục hồi da',
] as const;
