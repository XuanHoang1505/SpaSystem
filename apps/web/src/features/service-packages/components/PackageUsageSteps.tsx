import { CalendarCheckIcon, CreditCardIcon, TrendingUpIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/** Only what the system does: payment activates the package, sessions are booked in order, progress is shown to the customer. */
const steps = [
  {
    icon: CreditCardIcon,
    title: 'Thanh toán trực tuyến',
    description: 'Thanh toán qua cổng VNPay, gói được kích hoạt ngay khi thanh toán thành công.',
  },
  {
    icon: CalendarCheckIcon,
    title: 'Đặt lịch từng buổi',
    description:
      'Chọn ngày, khung giờ và kỹ thuật viên cho từng buổi theo thứ tự của gói, không mất thêm phí.',
  },
  {
    icon: TrendingUpIcon,
    title: 'Theo dõi tiến độ',
    description: 'Xem số buổi đã làm và buổi tiếp theo trong mục "Liệu trình của tôi".',
  },
] as const;

/** "Cách sử dụng gói": luồng mua → đặt buổi → theo dõi (SCR-W05). */
export function PackageUsageSteps() {
  return (
    <Card className="rounded-2xl py-0">
      <CardContent className="space-y-6 p-6 sm:p-7">
        <h2 id="package-usage" className="font-heading text-xl font-semibold text-foreground">
          Cách sử dụng gói
        </h2>
        <ol aria-labelledby="package-usage" className="grid gap-6 sm:grid-cols-3 sm:gap-5">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 sm:flex-col">
              <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="size-5" aria-hidden="true" />
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {index + 1}
                </span>
              </span>
              <div className="space-y-1">
                <p className="font-heading font-semibold text-foreground">{step.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
