import { CalendarCheckIcon, CreditCardIcon, SparklesIcon, TrendingUpIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    icon: CreditCardIcon,
    step: '01',
    title: 'Thanh toán trực tuyến an toàn',
    description:
      'Thanh toán qua cổng VNPay; gói liệu trình và toàn bộ số buổi được kích hoạt ngay vào tài khoản cá nhân.',
  },
  {
    icon: CalendarCheckIcon,
    step: '02',
    title: 'Chủ động đặt lịch từng buổi',
    description:
      'Tự do chọn ngày, khung giờ và chuyên viên bạn yêu thích cho từng buổi theo lộ trình mà không phát sinh chi phí.',
  },
  {
    icon: TrendingUpIcon,
    step: '03',
    title: 'Theo dõi nhật ký & tiến độ',
    description:
      'Sau mỗi buổi chăm sóc, kỹ thuật viên ghi nhận tình trạng da và bạn có thể theo dõi tiến độ liệu trình 24/7.',
  },
] as const;

/** "Cách sử dụng gói": luồng mua → đặt buổi → theo dõi (SCR-W05). */
export function PackageUsageSteps() {
  return (
    <Card className="rounded-2xl border bg-card/60">
      <CardContent className="space-y-6 p-6 sm:p-7">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <SparklesIcon className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="package-usage" className="font-heading text-xl font-semibold text-foreground">
              Quy trình sử dụng gói liệu trình
            </h2>
            <p className="text-xs text-muted-foreground">
              3 bước tiện lợi, linh hoạt và chủ động tối đa cho bạn
            </p>
          </div>
        </div>
        <ol aria-labelledby="package-usage" className="grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.title}
              className="group relative flex flex-col justify-between space-y-3 rounded-xl border bg-background/80 p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <step.icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="font-heading text-xl font-bold tracking-tight text-muted-foreground/40 group-hover:text-primary/60">
                    {step.step}
                  </span>
                </div>
                <p className="font-heading font-semibold text-foreground">{step.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
