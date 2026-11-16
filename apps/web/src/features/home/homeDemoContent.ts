/**
 * DEMO (15/11/2026): stand-in content for the home page until real data exists. Everything here is placeholder,
 * kept in one file so it is easy to replace or remove. The API has no category images yet, and the trust points
 * still need to be confirmed with the spa.
 */
import {
  Flower2Icon,
  HeadsetIcon,
  HeartHandshakeIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from 'lucide-react';

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

/**
 * DEMO: photos chosen by keywords in a category, service or package name. Categories have no image in the API, and
 * services or packages without their own image fall back to these.
 */
const demoPhotos: { keywords: string[]; src: string }[] = [
  { keywords: ['mặt', 'da', 'mụn', 'nám'], src: unsplash('photo-1570172619644-dfd03ed5d881') },
  { keywords: ['massage', 'đá', 'cổ', 'vai'], src: unsplash('photo-1544161515-4ab6ce6db874') },
  { keywords: ['gội', 'tóc', 'đầu'], src: unsplash('photo-1560066984-138dadb4c035') },
  {
    keywords: ['tắm', 'body', 'trắng', 'cơ thể'],
    src: unsplash('photo-1519823551278-64ac92734fb1'),
  },
  { keywords: ['xông', 'thảo', 'dược'], src: unsplash('photo-1600334089648-b0d9d3028eb2') },
];

export function demoPhotoFor(name: string, index: number): string {
  const lower = name.toLowerCase();
  const match = demoPhotos.find((item) => item.keywords.some((k) => lower.includes(k)));
  return (match ?? demoPhotos[index % demoPhotos.length]!).src;
}

/** DEMO: the spa's promises in the trust strip; confirm the wording with the spa before release. */
export const demoTrustItems: readonly { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Flower2Icon,
    title: 'Không gian thư giãn',
    description: 'Phòng riêng yên tĩnh, hương thảo mộc dịu nhẹ.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Sản phẩm rõ nguồn gốc',
    description: 'Mỹ phẩm chính hãng, an toàn cho làn da.',
  },
  {
    icon: HeartHandshakeIcon,
    title: 'Kỹ thuật viên tận tâm',
    description: 'Tư vấn theo tình trạng da của từng khách.',
  },
  {
    icon: HeadsetIcon,
    title: 'Hỗ trợ nhanh',
    description: 'Giải đáp và đổi lịch trong giờ mở cửa.',
  },
];

/** A review as the home page shows it: the public review plus the service it is about. */
export interface HomeReview {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  serviceName: string;
  createdAtUtc: string;
}

/**
 * DEMO: shown only while no service has a visible review with a comment yet (the seed data has none). The page labels
 * them "Đánh giá minh họa". Remove once real reviews exist.
 */
export const demoReviews: readonly HomeReview[] = [
  {
    id: 'demo-review-1',
    rating: 5,
    comment:
      'Phòng yên tĩnh, kỹ thuật viên hỏi kỹ tình trạng da trước khi làm. Sau buổi đầu da mềm và đỡ khô hẳn.',
    reviewerName: 'Trần Ngọc Hân',
    serviceName: 'Cấp ẩm phục hồi',
    createdAtUtc: '2026-11-08T03:00:00Z',
  },
  {
    id: 'demo-review-2',
    rating: 5,
    comment: 'Đặt lịch trên web rất nhanh, đến nơi không phải chờ. Massage cổ vai đúng chỗ đau.',
    reviewerName: 'Lê Minh Khoa',
    serviceName: 'Gội đầu kết hợp massage cổ vai',
    createdAtUtc: '2026-11-02T09:30:00Z',
  },
  {
    id: 'demo-review-3',
    rating: 4,
    comment:
      'Liệu trình theo gói giúp mình đi đều đặn hơn. Mỗi buổi đều có ghi chú tình trạng da để theo dõi.',
    reviewerName: 'Phạm Thu Trang',
    serviceName: 'Chăm sóc da cơ bản',
    createdAtUtc: '2026-10-27T07:15:00Z',
  },
];
