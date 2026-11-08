import type { ComponentProps } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * TẠM: nút của tính năng chưa có trên web (đặt lịch UC-SPA-15, giỏ hàng/mua UC-SPA-10/11,
 * trợ lý AI UC-SPA-32). Bấm chỉ báo "đang được phát triển"; thay bằng hành động thật khi có màn.
 */
export function ComingSoonButton({
  feature,
  ...props
}: ComponentProps<typeof Button> & { feature: string }) {
  return (
    <Button
      {...props}
      onClick={() => toast.info(`${feature} đang được phát triển, bạn vui lòng quay lại sau.`)}
    />
  );
}
