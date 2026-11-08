/**
 * TẠM THỜI: nội dung giao diện mà API chưa có (theo mẫu Stitch SCR-W02). Mọi chỗ hardcode của
 * danh mục nằm ở đây để xóa một lần khi có dữ liệu thật:
 * - điểm ★ và số đánh giá → UC-SPA-29 (đánh giá);
 * - bộ lọc thời lượng, tình trạng da → API chưa có tham số;
 * - dải cam kết → nội dung giới thiệu spa (UC-SPA-08).
 */

/** Điểm ★ giả, cố định theo id để không đổi giữa các lần render. */
export function placeholderRating(id: string): { score: number; count: number } {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { score: 4.6 + (hash % 5) / 10, count: 40 + (hash % 180) };
}

export const formatRating = (score: number) => score.toFixed(1).replace('.', ',');

/** Bộ lọc thời lượng (phút): chỉ hiển thị, chưa gửi lên API. */
export const placeholderDurations = [45, 60, 75, 90] as const;

/** Bộ lọc tình trạng da: chỉ hiển thị, chưa gửi lên API. */
export const placeholderSkinConcerns = [
  'Da dầu mụn, lỗ chân lông to',
  'Da xỉn màu, thiếu sức sống',
  'Da nhạy cảm, dễ kích ứng',
  'Da khô, thiếu ẩm',
] as const;

/** Dải cam kết cuối trang danh sách (không có nội dung y khoa). */
export const placeholderTrustItems = [
  {
    title: 'Kỹ thuật viên tận tâm',
    description: 'Mỗi liệu trình do kỹ thuật viên được đào tạo bài bản thực hiện.',
  },
  {
    title: 'Dụng cụ riêng cho từng khách',
    description: 'Khăn, dụng cụ được thay mới và vệ sinh sau mỗi lượt chăm sóc.',
  },
  {
    title: 'Sản phẩm rõ nguồn gốc',
    description: 'Mỹ phẩm và tinh dầu có nguồn gốc minh bạch, phù hợp nhiều loại da.',
  },
] as const;

/** "Bạn sẽ nhận được" trên trang chi tiết dịch vụ. */
export const placeholderServiceBenefits = [
  'Phòng chăm sóc riêng tư, yên tĩnh',
  'Kỹ thuật viên tư vấn theo tình trạng da',
  'Khăn và dụng cụ dùng riêng cho từng khách',
  'Trà thảo mộc sau buổi chăm sóc',
] as const;

/** Ô "Không gian" trên trang chi tiết dịch vụ. */
export const placeholderServiceSpace = 'Phòng riêng';

/** "Đặc quyền kèm gói" trên trang chi tiết gói. */
export const placeholderPackagePerks = [
  'Đặt lịch từng buổi linh hoạt trong thời hạn gói',
  'Theo dõi tiến độ liệu trình ngay trên tài khoản',
  'Kỹ thuật viên ghi nhận tình trạng da sau mỗi buổi',
] as const;
