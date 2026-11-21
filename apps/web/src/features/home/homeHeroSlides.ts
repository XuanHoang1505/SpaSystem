import massageImage from '@/assets/images/home-hero.webp';
import facialImage from '@/assets/images/home-hero-facial.jpg';
import spaImage from '@/assets/images/auth-spa.jpg';

/** Edit homepage banners, photos and destinations together here. */
export const homeHeroSlides = [
  {
    id: 'welcome',
    eyebrow: 'NHƯ NGUYỆT SPA',
    title: 'Chăm sóc sắc đẹp,',
    emphasis: 'lan tỏa bình an.',
    description:
      'Trải nghiệm không gian thư giãn và liệu trình chăm sóc da cùng đội ngũ kỹ thuật viên của Như Nguyệt Spa.',
    image: massageImage,
    imagePosition: '65% 40%',
    primary: { label: 'Đặt lịch ngay', to: '/services' },
    secondary: { label: 'Xem gói liệu trình', to: '/packages' },
  },
  {
    id: 'skin-care',
    eyebrow: 'CHĂM SÓC LÀN DA',
    title: 'Dịu dàng chăm sóc,',
    emphasis: 'rạng rỡ mỗi ngày.',
    description:
      'Lắng nghe làn da của bạn, khám phá dịch vụ chăm sóc phù hợp và chọn khung giờ thuận tiện để ghé spa.',
    image: facialImage,
    imagePosition: '60% 50%',
    primary: { label: 'Khám phá dịch vụ', to: '/services' },
    secondary: { label: 'Nhờ trợ lý tư vấn', to: '/ai-assistant' },
  },
  {
    id: 'relaxation',
    eyebrow: 'KHÔNG GIAN THƯ GIÃN',
    title: 'Một khoảng riêng,',
    emphasis: 'dành cho bạn.',
    description:
      'Tạm gác những bận rộn, dành thời gian nghỉ ngơi và tìm hiểu các gói chăm sóc nhiều buổi tại Như Nguyệt Spa.',
    image: spaImage,
    imagePosition: '65% 50%',
    primary: { label: 'Khám phá gói liệu trình', to: '/packages' },
    secondary: { label: 'Tìm hiểu về spa', to: '/about' },
  },
] as const;
