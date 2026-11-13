import type { CertificationVerificationStatus, StaffCertificationStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

const validity: Record<StaffCertificationStatus, { label: string; tone: StatusTone }> = {
  valid: { label: 'Còn hiệu lực', tone: 'success' },
  expiring_soon: { label: 'Sắp hết hạn', tone: 'warning' },
  expired: { label: 'Hết hạn', tone: 'danger' },
};

const review: Record<CertificationVerificationStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Chờ duyệt', tone: 'info' },
  verified: { label: 'Đã duyệt', tone: 'success' },
  rejected: { label: 'Bị từ chối', tone: 'danger' },
};

export const certificationValidityBadge = (status: StaffCertificationStatus) => validity[status];
export const certificationReviewBadge = (status: CertificationVerificationStatus) => review[status];
