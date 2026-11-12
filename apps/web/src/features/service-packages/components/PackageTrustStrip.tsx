import { CalendarCheckIcon, GemIcon, ShieldCheckIcon } from 'lucide-react';

const packageTrustPerks = [
  {
    icon: GemIcon,
    title: 'Tiết kiệm chi phí',
    description: 'Tối ưu đến 30% so với chi phí mua lẻ từng buổi dịch vụ.',
  },
  {
    icon: CalendarCheckIcon,
    title: 'Linh hoạt đặt hẹn',
    description: 'Chủ động chọn ngày, giờ và chuyên viên yêu thích cho từng buổi.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Bảo lưu liệu trình',
    description: 'Thời hạn dùng 60 – 180 ngày, hỗ trợ bảo lưu và gia hạn linh hoạt.',
  },
] as const;

export function PackageTrustStrip() {
  return (
    <section
      aria-label="Đặc quyền khi mua gói"
      className="grid gap-4 rounded-2xl border bg-muted/40 p-4 sm:grid-cols-3 sm:gap-6 sm:p-5"
    >
      {packageTrustPerks.map((perk) => {
        const Icon = perk.icon;
        return (
          <div key={perk.title} className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card text-primary shadow-2xs">
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold text-foreground">{perk.title}</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {perk.description}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
