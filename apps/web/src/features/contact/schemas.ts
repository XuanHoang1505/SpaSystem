import { z } from 'zod';

const PHONE = /^0\d{9}$/;

export const contactTopics = [
  { value: 'consult', label: 'Tư vấn dịch vụ, gói liệu trình' },
  { value: 'booking', label: 'Đặt lịch, đổi hoặc hủy lịch hẹn' },
  { value: 'order', label: 'Đơn hàng và thanh toán' },
  { value: 'feedback', label: 'Góp ý về dịch vụ' },
  { value: 'other', label: 'Vấn đề khác' },
] as const;

export type ContactTopic = (typeof contactTopics)[number]['value'];

export const MAX_CONTACT_MESSAGE = 1000;

export const contactMessageSchema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên.').max(100, 'Họ tên tối đa 100 ký tự.'),
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => value === '' || PHONE.test(value), {
      message: 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.',
    }),
  topic: z.enum(contactTopics.map((topic) => topic.value) as [ContactTopic, ...ContactTopic[]]),
  message: z
    .string()
    .trim()
    .min(10, 'Lời nhắn cần ít nhất 10 ký tự.')
    .max(MAX_CONTACT_MESSAGE, `Lời nhắn tối đa ${MAX_CONTACT_MESSAGE} ký tự.`),
});

export type ContactMessageValues = z.infer<typeof contactMessageSchema>;

/**
 * The spa has no contact inbox API yet, so the form writes an email in the visitor's own mail app. Nothing is sent
 * or stored by the system.
 */
export function buildContactMailto(email: string, values: ContactMessageValues): string {
  const topic = contactTopics.find((item) => item.value === values.topic)?.label ?? 'Liên hệ';
  const lines = [
    `Họ tên: ${values.fullName}`,
    values.phoneNumber ? `Số điện thoại: ${values.phoneNumber}` : null,
    `Chủ đề: ${topic}`,
    '',
    values.message,
  ].filter((line): line is string => line !== null);
  const subject = encodeURIComponent(`[Liên hệ] ${topic} - ${values.fullName}`);
  const body = encodeURIComponent(lines.join('\n'));
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
