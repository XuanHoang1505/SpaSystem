import { CalendarCheckIcon, CreditCardIcon, TrendingUpIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    icon: CreditCardIcon,
    title: 'Thanh toán gói',
    description:
      'Thanh toán trực tuyến qua VNPay; gói và các buổi được tạo ngay sau khi thanh toán.',
  },
  {
    icon: CalendarCheckIcon,
    title: 'Đặt lịch từng buổi',
    description:
      'Chọn ngày giờ cho buổi kế tiếp theo đúng trình tự liệu trình, không cần trả thêm.',
  },
  {
    icon: TrendingUpIcon,
    title: 'Theo dõi tiến độ',
    description: 'Sau mỗi buổi, tiến độ gói được cập nhật trong mục liệu trình của bạn.',
  },
] as const;

/** "Cách sử dụng gói": luồng mua → đặt buổi → theo dõi (UC-SPA-11/18/19). */
export function PackageUsageSteps() {
  return (
    <Card>
      <CardContent className="space-y-5">
        <h2 id="package-usage" className="text-2xl">
          Cách sử dụng gói
        </h2>
        <ol aria-labelledby="package-usage" className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="space-y-2 rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Bước {index + 1}
                </span>
              </div>
              <p className="font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
