import type { AppointmentStatus, ServiceHistorySource } from '@spa/shared-types';
import { colors } from '@/theme/colors';

export interface ServiceHistoryStatusMeta {
  label: string;
  tone: 'success' | 'danger' | 'neutral';
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

export function getServiceHistoryStatusMeta(status: AppointmentStatus): ServiceHistoryStatusMeta {
  switch (status) {
    case 'completed':
      return {
        label: 'Hoàn thành',
        tone: 'success',
        backgroundColor: colors.successSoft,
        textColor: colors.success,
        borderColor: colors.successBorder,
      };
    case 'no_show':
      return {
        label: 'Không đến',
        tone: 'danger',
        backgroundColor: colors.errorSoft,
        textColor: colors.error,
        borderColor: colors.errorBorder,
      };
    default:
      return {
        label: status,
        tone: 'neutral',
        backgroundColor: colors.neutralSoft,
        textColor: colors.neutral,
        borderColor: colors.neutralBorder,
      };
  }
}

export function formatServiceHistoryDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function getServiceHistorySourceLabel(
  source: ServiceHistorySource,
  packageName?: string | null,
  sequenceNumber?: number | null,
): { label: string; isPackage: boolean } {
  if (source === 'package' && packageName) {
    const seqStr = sequenceNumber != null ? ` · Buổi ${sequenceNumber}` : '';
    return {
      label: `Gói: ${packageName}${seqStr}`,
      isPackage: true,
    };
  }
  return {
    label: 'Dịch vụ lẻ',
    isPackage: false,
  };
}
