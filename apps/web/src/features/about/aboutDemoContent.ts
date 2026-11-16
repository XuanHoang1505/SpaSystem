/**
 * DEMO (15/11/2026): the about page's story, values, journey, gallery and some FAQ answers are placeholders until the
 * spa provides its own text and pictures. No numbers, awards, people or medical claims on purpose; replace this file
 * as a whole. FAQ answers built from `catalogPolicies` follow the real system rules.
 */
import { HandHeartIcon, LeafIcon, SparklesIcon, type LucideIcon } from 'lucide-react';
import { catalogPolicies } from '@/features/services/catalogPolicies';

const unsplash = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`;

export const demoStory = {
  photo: unsplash('photo-1600334089648-b0d9d3028eb2'),
  paragraphs: [
    'Như Nguyệt Spa bắt đầu từ một mong muốn giản dị: tạo ra một nơi để phụ nữ được nghỉ ngơi thật sự, chậm lại một chút giữa nhịp sống bận rộn.',
    'Mỗi liệu trình được xây dựng từ việc lắng nghe làn da và thói quen của từng khách, rồi đi cùng bạn qua từng buổi, có ghi chép và theo dõi tiến trình rõ ràng.',
  ],
} as const;

/** The spa's own words on a full-width band, signed by the spa (no invented founder). */
export const demoNote = {
  quote:
    'Chúng tôi không hứa làm bạn đẹp hơn sau một buổi. Chúng tôi hứa mỗi lần bạn đến, bạn được lắng nghe, được nghỉ ngơi và rời đi nhẹ nhõm hơn lúc bước vào.',
  paragraphs: [
    'Làn da đẹp lên nhờ sự đều đặn và đúng cách, không nhờ một liệu pháp thần kỳ nào. Vì vậy spa chú trọng việc theo dõi qua từng buổi hơn là những lời quảng cáo.',
    'Nếu tình trạng da của bạn cần điều trị, kỹ thuật viên sẽ khuyên bạn gặp bác sĩ da liễu trước, rồi cùng bạn chọn cách chăm sóc phù hợp sau đó.',
  ],
} as const;

export const demoValues: readonly { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: HandHeartIcon,
    title: 'Lắng nghe trước khi chăm sóc',
    description:
      'Kỹ thuật viên hỏi về làn da, dị ứng và mong muốn của bạn trước mỗi buổi, rồi ghi lại để lần sau không phải kể lại.',
  },
  {
    icon: LeafIcon,
    title: 'Nhẹ nhàng và rõ nguồn gốc',
    description:
      'Ưu tiên sản phẩm chính hãng, thành phần dịu nhẹ. Spa tư vấn làm đẹp, không chẩn đoán hay điều trị bệnh.',
  },
  {
    icon: SparklesIcon,
    title: 'Minh bạch từ đầu đến cuối',
    description:
      'Giá niêm yết, đặt lịch và thanh toán trực tuyến, tiến trình liệu trình luôn xem được trong tài khoản của bạn.',
  },
];

/** Two photos of the space beside the values. */
export const demoSpacePhotos = [
  { src: unsplash('photo-1544161515-4ab6ce6db874', 900), alt: 'Phòng trị liệu yên tĩnh' },
  { src: unsplash('photo-1570172619644-dfd03ed5d881', 900), alt: 'Chăm sóc da mặt' },
] as const;

/** One visit from booking to follow-up; each step matches something the system really does. */
export const demoJourney: readonly { title: string; description: string }[] = [
  {
    title: 'Đặt lịch trực tuyến',
    description:
      'Chọn dịch vụ, ngày giờ và kỹ thuật viên trên web hoặc ứng dụng, thanh toán trực tuyến nếu chưa mua trước.',
  },
  {
    title: 'Trò chuyện và ghi nhận',
    description:
      'Trước buổi chăm sóc, kỹ thuật viên hỏi về làn da, dị ứng và thói quen của bạn, rồi ghi vào hồ sơ da.',
  },
  {
    title: 'Thư giãn trong phòng riêng',
    description:
      'Liệu trình diễn ra trong phòng riêng yên tĩnh, kỹ thuật viên giải thích từng bước trước khi làm.',
  },
  {
    title: 'Gợi ý chăm sóc tại nhà',
    description:
      'Sau buổi, bạn nhận lời khuyên chăm sóc phù hợp và những lưu ý cho lần hẹn tiếp theo.',
  },
  {
    title: 'Theo dõi tiến trình',
    description:
      'Với gói liệu trình, mỗi buổi hoàn thành được cập nhật trong tài khoản để bạn biết mình đang ở đâu.',
  },
];

/** The space, as a small gallery: the first photo is the large one. */
export const demoGallery: readonly { src: string; caption: string }[] = [
  { src: unsplash('photo-1507652313519-d4e9174996dd'), caption: 'Phòng tắm thảo mộc' },
  { src: unsplash('photo-1596178060671-7a80dc8059ea', 900), caption: 'Phòng trị liệu riêng' },
  { src: unsplash('photo-1515377905703-c4788e51af15', 900), caption: 'Tinh dầu thiên nhiên' },
  { src: unsplash('photo-1560066984-138dadb4c035', 900), caption: 'Khu gội và chăm sóc tóc' },
  { src: unsplash('photo-1540555700478-4be289fbecef', 900), caption: 'Khăn sạch cho từng khách' },
];

export interface AboutFaq {
  question: string;
  answer: string;
}

export const demoFaqs: readonly AboutFaq[] = [
  {
    question: 'Tôi có cần đặt lịch trước không?',
    answer:
      'Nên đặt trước để spa chuẩn bị phòng và kỹ thuật viên cho bạn. Bạn có thể đặt trên web hoặc ứng dụng, chọn khung giờ còn trống trong vòng ' +
      `${catalogPolicies.maxBookingDaysAhead} ngày tới.`,
  },
  {
    question: 'Tôi có thể đổi giờ hoặc hủy lịch không?',
    answer: `Được, nếu còn ít nhất ${catalogPolicies.customerChangeCutoffHours} giờ trước giờ hẹn. Bạn tự đổi hoặc hủy trong mục lịch hẹn của mình; dịch vụ hoặc buổi đã mua được trả lại để đặt lần khác.`,
  },
  {
    question: 'Da tôi nhạy cảm hoặc đang bị dị ứng thì sao?',
    answer:
      'Hãy báo cho kỹ thuật viên trước buổi chăm sóc. Thông tin dị ứng được ghi vào hồ sơ của bạn để những lần sau ai chăm sóc cũng biết. Với tình trạng da cần điều trị, bạn nên hỏi bác sĩ da liễu trước.',
  },
  {
    question: 'Spa nhận thanh toán bằng cách nào?',
    answer:
      'Spa nhận thanh toán trực tuyến qua cổng VNPay khi bạn mua dịch vụ hoặc gói liệu trình. Dịch vụ đã mua được đặt lịch bất cứ lúc nào mà không phải trả thêm.',
  },
  {
    question: 'Tôi nên đến trước giờ hẹn bao lâu?',
    answer:
      'Bạn nên đến sớm khoảng 10 phút để thay đồ và trò chuyện với kỹ thuật viên, buổi chăm sóc sẽ bắt đầu đúng giờ đã đặt.',
  },
  {
    question: 'Spa có chỗ gửi xe không?',
    answer:
      'Spa có chỗ gửi xe máy miễn phí ngay trước cửa. Với ô tô, bạn có thể gửi ở bãi gần nhất.',
  },
];
