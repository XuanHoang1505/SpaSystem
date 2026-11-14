import { colors } from '@theme/index';
import type { CatalogItemType, OrderStatus, PaymentStatus } from '@spa/shared-types';

export type StatusBadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export interface StatusMeta {
  label: string;
  tone: StatusBadgeTone;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

const TONE_COLORS: Record<
  StatusBadgeTone,
  { backgroundColor: string; textColor: string; borderColor: string }
> = {
  success: {
    backgroundColor: colors.successSoft,
    textColor: colors.success,
    borderColor: colors.successBorder,
  },
  info: {
    backgroundColor: colors.primarySoft,
    textColor: colors.primary,
    borderColor: colors.secondary,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    textColor: colors.warning,
    borderColor: colors.warningBorder,
  },
  danger: {
    backgroundColor: colors.errorSoft,
    textColor: colors.error,
    borderColor: colors.errorBorder,
  },
  neutral: {
    backgroundColor: colors.neutralSoft,
    textColor: colors.neutral,
    borderColor: colors.neutralBorder,
  },
};

function makeMeta(label: string, tone: StatusBadgeTone): StatusMeta {
  return {
    label,
    tone,
    ...TONE_COLORS[tone],
  };
}

export function getOrderStatusMeta(status: OrderStatus): StatusMeta {
  switch (status) {
    case 'pending_payment':
      return makeMeta('Chờ thanh toán', 'warning');
    case 'paid':
      return makeMeta('Đã thanh toán', 'success');
    case 'cancelled':
      return makeMeta('Đã hủy', 'danger');
    case 'expired':
      return makeMeta('Đã hết hạn', 'neutral');
  }
}

export function getPaymentStatusMeta(status: PaymentStatus): StatusMeta {
  switch (status) {
    case 'succeeded':
      return makeMeta('Thành công', 'success');
    case 'pending':
      return makeMeta('Đang xử lý', 'warning');
    case 'failed':
      return makeMeta('Thất bại', 'danger');
    case 'expired':
      return makeMeta('Hết hạn', 'neutral');
  }
}

export function getItemTypeLabel(type: CatalogItemType): string {
  return type === 'package' ? 'Gói liệu trình' : 'Dịch vụ lẻ';
}

const vnDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatUtcDateTimeVn(utcIso: string | null | undefined): string {
  if (!utcIso) return '—';
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return utcIso;
  return vnDateTimeFormatter.format(date);
}

