import { ApiClientError, errorCodeOf, purchaseErrorCodes } from '@spa/api-client';
import { colors } from '@theme/index';
import type {
  CustomerPackageStatus,
  EntitlementStatus,
  PurchasedPackage,
  PurchasedService,
  TreatmentPlanStatus,
  TreatmentSessionStatus,
} from '@spa/shared-types';

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

/**
 * BR-TRT-04: Statuses are effective statuses computed by backend; client never overrides them.
 */
export function getEntitlementStatusMeta(status: EntitlementStatus): StatusMeta {
  switch (status) {
    case 'available':
      return makeMeta('Còn hiệu lực', 'success');
    case 'booked':
      return makeMeta('Đã đặt lịch', 'info');
    case 'used':
      return makeMeta('Đã sử dụng', 'neutral');
    case 'expired':
      return makeMeta('Hết hạn', 'neutral');
  }
}

export function getPackageStatusMeta(status: CustomerPackageStatus): StatusMeta {
  switch (status) {
    case 'active':
      return makeMeta('Đang dùng', 'success');
    case 'completed':
      return makeMeta('Hoàn thành', 'info');
    case 'expired':
      return makeMeta('Hết hạn', 'neutral');
    case 'cancelled':
      return makeMeta('Đã hủy', 'danger');
  }
}

export function getTreatmentPlanStatusMeta(status: TreatmentPlanStatus): StatusMeta {
  switch (status) {
    case 'not_started':
      return makeMeta('Chưa bắt đầu', 'neutral');
    case 'in_progress':
      return makeMeta('Đang thực hiện', 'success');
    case 'completed':
      return makeMeta('Đã hoàn thành', 'info');
    case 'paused':
      return makeMeta('Tạm dừng', 'warning');
    case 'cancelled':
      return makeMeta('Đã hủy', 'danger');
  }
}

export function getTreatmentSessionStatusMeta(status: TreatmentSessionStatus): StatusMeta {
  switch (status) {
    case 'not_booked':
      return makeMeta('Chưa đặt lịch', 'neutral');
    case 'booked':
      return makeMeta('Đã đặt lịch', 'info');
    case 'completed':
      return makeMeta('Đã hoàn thành', 'success');
    case 'skipped':
      return makeMeta('Đã bỏ qua', 'neutral');
  }
}

const vnDatePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const vnDisplayDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Định dạng mốc UTC (`purchasedAtUtc`, `expiresAtUtc`, `activatedAtUtc`) sang `dd/MM/yyyy` theo múi giờ Việt Nam.
 */
export function formatUtcDateVn(utcIso: string | null | undefined): string {
  if (!utcIso) return 'Không giới hạn';
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return utcIso;
  return vnDisplayDateFormatter.format(date);
}

function toVnDayNumber(date: Date): number {
  const parts = vnDatePartsFormatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 1970);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 1);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export interface RemainingDaysInfo {
  formattedDate: string;
  remainingLabel: string;
  daysRemaining: number | null;
  isExpired: boolean;
}

/**
 * Tính số ngày còn lại tính theo lịch ngày tại múi giờ `Asia/Ho_Chi_Minh`.
 */
export function getRemainingDaysInfo(
  expiresAtUtc: string | null | undefined,
  now: Date = new Date(),
): RemainingDaysInfo {
  if (!expiresAtUtc) {
    return {
      formattedDate: 'Không giới hạn',
      remainingLabel: 'Không giới hạn thời gian',
      daysRemaining: null,
      isExpired: false,
    };
  }
  const target = new Date(expiresAtUtc);
  if (Number.isNaN(target.getTime())) {
    return {
      formattedDate: expiresAtUtc,
      remainingLabel: '',
      daysRemaining: null,
      isExpired: false,
    };
  }
  const formattedDate = vnDisplayDateFormatter.format(target);
  const diffDays = toVnDayNumber(target) - toVnDayNumber(now);
  if (diffDays < 0) {
    return {
      formattedDate,
      remainingLabel: 'Đã hết hạn',
      daysRemaining: diffDays,
      isExpired: true,
    };
  }
  if (diffDays === 0) {
    return {
      formattedDate,
      remainingLabel: 'Hết hạn hôm nay',
      daysRemaining: 0,
      isExpired: false,
    };
  }
  return {
    formattedDate,
    remainingLabel: `Còn ${diffDays} ngày`,
    daysRemaining: diffDays,
    isExpired: false,
  };
}

/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm kiếm không phân biệt hoa thường và dấu.
 */
export function normalizeVietnameseSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

export type PurchaseTabType = 'packages' | 'services';
export type PackageFilterStatus = 'all' | CustomerPackageStatus;
export type ServiceFilterStatus = 'all' | EntitlementStatus;
export type PurchaseSortOrder = 'newest' | 'expiring_soon';

export function countPackagesByStatus(
  packages: readonly PurchasedPackage[],
): Record<PackageFilterStatus, number> {
  const counts: Record<PackageFilterStatus, number> = {
    all: packages.length,
    active: 0,
    completed: 0,
    expired: 0,
    cancelled: 0,
  };
  for (const pkg of packages) {
    counts[pkg.status] = (counts[pkg.status] ?? 0) + 1;
  }
  return counts;
}

export function countServicesByStatus(
  services: readonly PurchasedService[],
): Record<ServiceFilterStatus, number> {
  const counts: Record<ServiceFilterStatus, number> = {
    all: services.length,
    available: 0,
    booked: 0,
    used: 0,
    expired: 0,
  };
  for (const svc of services) {
    counts[svc.status] = (counts[svc.status] ?? 0) + 1;
  }
  return counts;
}

function compareBySortOrder<T extends { purchasedAtUtc: string; expiresAtUtc: string | null }>(
  a: T,
  b: T,
  sort: PurchaseSortOrder,
): number {
  if (sort === 'expiring_soon') {
    if (a.expiresAtUtc && b.expiresAtUtc) {
      return new Date(a.expiresAtUtc).getTime() - new Date(b.expiresAtUtc).getTime();
    }
    if (a.expiresAtUtc && !b.expiresAtUtc) return -1;
    if (!a.expiresAtUtc && b.expiresAtUtc) return 1;
  }
  return new Date(b.purchasedAtUtc).getTime() - new Date(a.purchasedAtUtc).getTime();
}

export function filterAndSortPackages(
  packages: readonly PurchasedPackage[],
  options: {
    statusFilter: PackageFilterStatus;
    query: string;
    sort: PurchaseSortOrder;
  },
): PurchasedPackage[] {
  const normalizedQuery = normalizeVietnameseSearch(options.query);
  return packages
    .filter((pkg) => {
      if (options.statusFilter !== 'all' && pkg.status !== options.statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const target = normalizeVietnameseSearch(`${pkg.packageName} ${pkg.order.code}`);
      return target.includes(normalizedQuery);
    })
    .sort((a, b) => compareBySortOrder(a, b, options.sort));
}

export function filterAndSortServices(
  services: readonly PurchasedService[],
  options: {
    statusFilter: ServiceFilterStatus;
    query: string;
    sort: PurchaseSortOrder;
  },
): PurchasedService[] {
  const normalizedQuery = normalizeVietnameseSearch(options.query);
  return services
    .filter((svc) => {
      if (options.statusFilter !== 'all' && svc.status !== options.statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const target = normalizeVietnameseSearch(`${svc.serviceName} ${svc.order.code}`);
      return target.includes(normalizedQuery);
    })
    .sort((a, b) => compareBySortOrder(a, b, options.sort));
}

/**
 * Lý do ngắn khi gói đã mua không thể đặt lịch buổi kế tiếp.
 */
export function getPackageCannotBookReason(pkg: PurchasedPackage): string {
  if (pkg.status === 'expired') return 'Gói đã hết hạn sử dụng';
  if (pkg.status === 'completed') return 'Gói đã hoàn thành tất cả các buổi';
  if (pkg.status === 'cancelled') return 'Gói dịch vụ đã hủy';
  if (pkg.treatmentPlan.status === 'paused') return 'Liệu trình đang tạm dừng';
  if (pkg.treatmentPlan.status === 'cancelled') return 'Liệu trình đã hủy';
  if (pkg.treatmentPlan.status === 'completed') return 'Liệu trình đã hoàn thành';
  if (pkg.bookedSessions + pkg.usedSessions >= pkg.totalSessions) {
    return 'Các buổi còn lại đều đã được đặt lịch';
  }
  return 'Chưa đủ điều kiện đặt lịch buổi tiếp theo';
}

export interface ClassifiedPurchaseError {
  kind: 'not_found' | 'validation' | 'unauthorized' | 'forbidden' | 'network';
  code?: string;
  message: string;
}

export function classifyPurchaseError(error: unknown): ClassifiedPurchaseError {
  const code = errorCodeOf(error);
  const status = error instanceof ApiClientError ? error.status : 0;
  const fallbackMessage =
    error instanceof Error && error.message
      ? error.message
      : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';

  if (status === 401) {
    return {
      kind: 'unauthorized',
      code,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      code,
      message: 'Tài khoản của bạn không có quyền thực hiện thao tác này.',
    };
  }
  if (
    code === purchaseErrorCodes.customerPackageNotFound ||
    code === purchaseErrorCodes.entitlementNotFound ||
    status === 404
  ) {
    return {
      kind: 'not_found',
      code,
      message: 'Không tìm thấy thông tin gói hoặc dịch vụ đã mua.',
    };
  }
  if (code === purchaseErrorCodes.validationError || status === 400) {
    return {
      kind: 'validation',
      code,
      message: fallbackMessage,
    };
  }
  return {
    kind: 'network',
    code,
    message: fallbackMessage,
  };
}
