import { describe, expect, it } from 'vitest';
import { buildContactMailto, contactMessageSchema } from './schemas';

const valid = {
  fullName: 'Nguyễn Thị Lan',
  phoneNumber: '',
  topic: 'booking' as const,
  message: 'Tôi muốn đổi lịch hẹn sang chiều thứ Bảy.',
};

describe('contactMessageSchema', () => {
  it('accepts a message without a phone number', () => {
    expect(contactMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a malformed phone number and a too-short message', () => {
    const result = contactMessageSchema.safeParse({
      ...valid,
      phoneNumber: '12345',
      message: 'ngắn',
    });
    expect(result.success).toBe(false);
    const fields = result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['phoneNumber', 'message']));
  });
});

describe('buildContactMailto', () => {
  it('addresses the spa and carries the topic, name, phone and message', () => {
    const href = buildContactMailto('lienhe@example.vn', { ...valid, phoneNumber: '0901234567' });
    expect(href.startsWith('mailto:lienhe@example.vn?subject=')).toBe(true);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('subject')).toBe(
      '[Liên hệ] Đặt lịch, đổi hoặc hủy lịch hẹn - Nguyễn Thị Lan',
    );
    const body = params.get('body') ?? '';
    expect(body).toContain('Số điện thoại: 0901234567');
    expect(body).toContain(valid.message);
  });

  it('leaves out the phone line when none was given', () => {
    const body = new URLSearchParams(buildContactMailto('a@b.vn', valid).split('?')[1]).get('body');
    expect(body).not.toContain('Số điện thoại');
  });
});
