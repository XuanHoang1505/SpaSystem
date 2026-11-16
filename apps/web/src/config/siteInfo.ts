/**
 * The spa's public contact details, shown in the footer and on the about page (UC-SPA-08).
 * DEMO (15/11/2026): address, phone, email, hours and social links are placeholders until the spa provides them.
 */
export const siteInfo = {
  name: 'Như Nguyệt Spa',
  tagline: 'Vẻ đẹp từ sự cân bằng',
  address: '123 Đường Hoa Sen, Phường 1, TP. Hồ Chí Minh',
  phone: '0900 000 000',
  email: 'lienhe@nhunguyetspa.vn',
  openingHours: 'Thứ Hai đến Chủ Nhật, 08:00 - 20:00',
  /** Empty href: shown as plain text until a real page exists. */
  socials: [
    { label: 'Facebook', href: '' },
    { label: 'Zalo', href: '' },
    { label: 'TikTok', href: '' },
  ],
} as const;
