import { ApiClientError, appointmentErrorCodes, errorCodeOf } from '@spa/api-client';
import { colors } from '@theme/index';
import type { AvailabilitySource } from '@spa/api-client';
import type {
  AppointmentBookingSource,
  AppointmentStatus,
  AvailableStaff,
  MyTreatmentSessionRef,
} from '@spa/shared-types';

export const MAX_BOOKING_ADVANCE_DAYS = 60;

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

export function isValidGuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && GUID_REGEX.test(value.trim());
}

export type ParsedBookingSource =
  | {
      valid: true;
      kind: 'service';
      serviceId: string;
      initialDate?: string;
      initialStartTime?: string;
      initialStaffMemberId?: string;
    }
  | {
      valid: true;
      kind: 'entitlement';
      serviceEntitlementId: string;
      initialDate?: string;
      initialStartTime?: string;
      initialStaffMemberId?: string;
    }
  | {
      valid: true;
      kind: 'session';
      treatmentSessionId: string;
      treatmentPlanId?: string;
      initialDate?: string;
      initialStartTime?: string;
      initialStaffMemberId?: string;
    }
  | {
      valid: false;
      error: string;
    };

export function parseBookingSourceParams(params: {
  serviceId?: string;
  serviceEntitlementId?: string;
  treatmentSessionId?: string;
  treatmentPlanId?: string;
  date?: string;
  startTime?: string;
  staffMemberId?: string;
}): ParsedBookingSource {
  const hasService = Boolean(params.serviceId?.trim());
  const hasEntitlement = Boolean(params.serviceEntitlementId?.trim());
  const hasSession = Boolean(params.treatmentSessionId?.trim());

  const count = Number(hasService) + Number(hasEntitlement) + Number(hasSession);
  if (count === 0) {
    return {
      valid: false,
      error: 'Không xác định được dịch vụ hoặc quyền sử dụng cần đặt lịch.',
    };
  }
  if (count > 1) {
    return {
      valid: false,
      error: 'Chỉ được chọn một nguồn đặt lịch (dịch vụ lẻ, quyền đã mua hoặc buổi liệu trình).',
    };
  }

  const initialDate =
    params.date && DATE_REGEX.test(params.date.trim()) ? params.date.trim() : undefined;
  const initialStartTime =
    params.startTime && TIME_REGEX.test(params.startTime.trim().slice(0, 5))
      ? params.startTime.trim().slice(0, 5)
      : undefined;
  const initialStaffMemberId = isValidGuid(params.staffMemberId)
    ? params.staffMemberId.trim()
    : undefined;

  if (hasService) {
    if (!isValidGuid(params.serviceId)) {
      return { valid: false, error: 'Mã dịch vụ không hợp lệ.' };
    }
    return {
      valid: true,
      kind: 'service',
      serviceId: params.serviceId.trim(),
      initialDate,
      initialStartTime,
      initialStaffMemberId,
    };
  }

  if (hasEntitlement) {
    if (!isValidGuid(params.serviceEntitlementId)) {
      return { valid: false, error: 'Mã quyền sử dụng dịch vụ không hợp lệ.' };
    }
    return {
      valid: true,
      kind: 'entitlement',
      serviceEntitlementId: params.serviceEntitlementId.trim(),
      initialDate,
      initialStartTime,
      initialStaffMemberId,
    };
  }

  if (!isValidGuid(params.treatmentSessionId)) {
    return { valid: false, error: 'Mã buổi liệu trình không hợp lệ.' };
  }
  const treatmentPlanId = isValidGuid(params.treatmentPlanId)
    ? params.treatmentPlanId.trim()
    : undefined;

  return {
    valid: true,
    kind: 'session',
    treatmentSessionId: params.treatmentSessionId.trim(),
    treatmentPlanId,
    initialDate,
    initialStartTime,
    initialStaffMemberId,
  };
}

export function toAvailabilitySource(
  parsed: Extract<ParsedBookingSource, { valid: true }>,
): AvailabilitySource {
  if (parsed.kind === 'service') {
    return { spaServiceId: parsed.serviceId };
  }
  if (parsed.kind === 'entitlement') {
    return { serviceEntitlementId: parsed.serviceEntitlementId };
  }
  return { treatmentSessionId: parsed.treatmentSessionId };
}

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const vnTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Today's date in `Asia/Ho_Chi_Minh` formatted as `yyyy-MM-dd`. */
export function getTodayVnDate(now: Date = new Date()): string {
  return vnDateFormatter.format(now);
}

/** Current date (`yyyy-MM-dd`) and time (`HH:mm`) in `Asia/Ho_Chi_Minh`. */
export function getTodayVnNow(now: Date = new Date()): { date: string; time: string } {
  return {
    date: vnDateFormatter.format(now),
    time: vnTimeFormatter.format(now).slice(0, 5),
  };
}

export function addDaysToDate(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_OF_WEEK_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;

export interface DateOption {
  date: string;
  dayOfWeekLabel: string;
  dayNumber: string;
  monthNumber: string;
  dayMonthLabel: string;
  isToday: boolean;
  disabled: boolean;
}

export function buildBookingDateRange(
  todayVn: string,
  earliestDate?: string | null,
  maxAdvanceDays: number = MAX_BOOKING_ADVANCE_DAYS,
): DateOption[] {
  const minAllowedDate = earliestDate && earliestDate > todayVn ? earliestDate : todayVn;
  const result: DateOption[] = [];

  for (let offset = 0; offset <= maxAdvanceDays; offset++) {
    const date = addDaysToDate(todayVn, offset);
    const parts = date.split('-').map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const dow = utcDate.getUTCDay();
    const dayNumber = String(day).padStart(2, '0');
    const monthNumber = String(month).padStart(2, '0');

    result.push({
      date,
      dayOfWeekLabel: DAY_OF_WEEK_LABELS[dow] ?? 'T2',
      dayNumber,
      monthNumber,
      dayMonthLabel: `${dayNumber}/${monthNumber}`,
      isToday: date === todayVn,
      disabled: date < minAllowedDate,
    });
  }

  return result;
}

export function resolveInitialBookingDate(
  todayVn: string,
  earliestDate?: string | null,
  requestedDate?: string | null,
): string {
  const maxDate = addDaysToDate(todayVn, MAX_BOOKING_ADVANCE_DAYS);
  const minDate = earliestDate && earliestDate > todayVn ? earliestDate : todayVn;
  if (requestedDate && requestedDate >= minDate && requestedDate <= maxDate) {
    return requestedDate;
  }
  return minDate <= maxDate ? minDate : todayVn;
}

export interface PickedSlot {
  startTime: string;
  staffMemberId?: string;
}

export interface MergedTimeSlot {
  startTime: string;
  endTime: string;
  availableStaffCount: number;
  staffIds: string[];
}

/** Unique start times (`HH:mm`) across all staff, sorted ascending (same as web `anyStaffTimes`). */
export function anyStaffTimes(staff: readonly AvailableStaff[]): string[] {
  const times = new Set(
    staff.flatMap((member) => member.slots.map((slot) => slot.startTime.slice(0, 5))),
  );
  return [...times].sort();
}

/** Filters out elapsed times when `date === now.date` (Vietnam local time). */
export function hideElapsedTimes(
  times: readonly string[],
  date: string,
  now: { date: string; time: string },
): string[] {
  return date === now.date ? times.filter((time) => time > now.time) : [...times];
}

/** Returns staff members who are free at the chosen `startTime` (`HH:mm`). */
export function getStaffAvailableAtTime(
  staff: readonly AvailableStaff[],
  startTime: string,
): AvailableStaff[] {
  const normalized = startTime.slice(0, 5);
  return staff.filter((member) =>
    member.slots.some((slot) => slot.startTime.slice(0, 5) === normalized),
  );
}

/** Finds the corresponding `endTime` (`HH:mm`) for a chosen `startTime`. */
export function findEndTimeForStartTime(
  staff: readonly AvailableStaff[],
  startTime: string | undefined,
): string | undefined {
  if (!startTime) return undefined;
  const normalized = startTime.slice(0, 5);
  for (const member of staff) {
    const match = member.slots.find((slot) => slot.startTime.slice(0, 5) === normalized);
    if (match) {
      return match.endTime.slice(0, 5);
    }
  }
  return undefined;
}

export const quickNoteSuggestions = [
  'Da nhạy cảm, tránh lực mạnh',
  'Tránh tinh dầu mùi nồng',
  'Cần soi da trước buổi hẹn',
  'Có thể đến trễ 5–10 phút',
] as const;

/** Merges unique `startTime` slots across all available staff for "Kỹ thuật viên bất kỳ". */
export function mergeAvailableSlots(staff: readonly AvailableStaff[]): MergedTimeSlot[] {
  const map = new Map<string, MergedTimeSlot>();

  for (const member of staff) {
    for (const slot of member.slots) {
      const start = slot.startTime.slice(0, 5);
      const end = slot.endTime.slice(0, 5);
      const existing = map.get(start);
      if (existing) {
        if (!existing.staffIds.includes(member.id)) {
          existing.staffIds.push(member.id);
          existing.availableStaffCount = existing.staffIds.length;
        }
      } else {
        map.set(start, {
          startTime: start,
          endTime: end,
          availableStaffCount: 1,
          staffIds: [member.id],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** Returns slots for a specific staff member, or merged slots when `staffMemberId` is omitted. */
export function getSlotsForStaff(
  staff: readonly AvailableStaff[],
  staffMemberId?: string,
): MergedTimeSlot[] {
  if (!staffMemberId) {
    return mergeAvailableSlots(staff);
  }
  const member = staff.find((item) => item.id === staffMemberId);
  if (!member) {
    return [];
  }
  return member.slots
    .map((slot) => ({
      startTime: slot.startTime.slice(0, 5),
      endTime: slot.endTime.slice(0, 5),
      availableStaffCount: 1,
      staffIds: [member.id],
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export type AppointmentStatusTone = 'warning' | 'info' | 'success' | 'neutral' | 'danger';

export interface AppointmentStatusMeta {
  label: string;
  tone: AppointmentStatusTone;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

export function getAppointmentStatusMeta(status: AppointmentStatus): AppointmentStatusMeta {
  switch (status) {
    case 'held':
      return {
        label: 'Đang giữ chỗ',
        tone: 'warning',
        backgroundColor: colors.warningSoft,
        textColor: colors.warning,
        borderColor: colors.warningBorder,
      };
    case 'pending_confirmation':
      return {
        label: 'Chờ xác nhận',
        tone: 'info',
        backgroundColor: colors.infoSoft,
        textColor: colors.info,
        borderColor: colors.infoBorder,
      };
    case 'confirmed':
      return {
        label: 'Đã xác nhận',
        tone: 'success',
        backgroundColor: colors.successSoft,
        textColor: colors.success,
        borderColor: colors.successBorder,
      };
    case 'completed':
      return {
        label: 'Hoàn thành',
        tone: 'neutral',
        backgroundColor: colors.neutralSoft,
        textColor: colors.text,
        borderColor: colors.border,
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        tone: 'danger',
        backgroundColor: colors.errorSoft,
        textColor: colors.error,
        borderColor: colors.errorBorder,
      };
    case 'no_show':
      return {
        label: 'Không đến',
        tone: 'danger',
        backgroundColor: colors.warningSoft,
        textColor: colors.warning,
        borderColor: colors.warningBorder,
      };
    case 'hold_expired':
      return {
        label: 'Hết hạn giữ chỗ',
        tone: 'neutral',
        backgroundColor: colors.neutralSoft,
        textColor: colors.neutral,
        borderColor: colors.neutralBorder,
      };
  }
}

export function getBookingSourceLabel(
  source: AppointmentBookingSource,
  treatmentSession?: MyTreatmentSessionRef | null,
): string {
  if (source === 'session') {
    if (treatmentSession) {
      return `Buổi ${treatmentSession.sequenceNumber} · ${treatmentSession.packageName}`;
    }
    return 'Buổi trong gói liệu trình';
  }
  if (source === 'entitlement') {
    return 'Dịch vụ lẻ đã mua';
  }
  return 'Đặt trực tiếp';
}

export interface ClassifiedBookingError {
  code: string | undefined;
  message: string;
  isPromotionError: boolean;
  shouldClearSlot: boolean;
  shouldRefetchAvailability: boolean;
  shouldResetStaff: boolean;
  shouldCloseModal: boolean;
  shouldRefetchAppointment: boolean;
  shouldRefetchSource: boolean;
}

export function classifyBookingError(error: unknown): ClassifiedBookingError {
  const code = errorCodeOf(error);
  // The field-level message is the specific one; the envelope message is generic, and a connection failure
  // (status 0) carries the client's English text, so it never reaches the user.
  const apiMessage =
    error instanceof ApiClientError && error.status !== 0
      ? error.errors[0]?.message?.trim() || error.message.trim() || undefined
      : undefined;

  switch (code) {
    case appointmentErrorCodes.slotUnavailable:
      return {
        code,
        message:
          apiMessage ??
          'Khung giờ vừa được khách khác đặt hoặc không còn kỹ thuật viên trống. Vui lòng chọn khung giờ khác.',
        isPromotionError: false,
        shouldClearSlot: true,
        shouldRefetchAvailability: true,
        shouldResetStaff: false,
        shouldCloseModal: false,
        shouldRefetchAppointment: false,
        shouldRefetchSource: false,
      };
    case appointmentErrorCodes.customerBusy:
    case appointmentErrorCodes.outsideWorkSchedule:
    case appointmentErrorCodes.slotTooSoon:
    case appointmentErrorCodes.appointmentInPast:
      return {
        code,
        message: apiMessage ?? 'Khung giờ đã chọn không còn hợp lệ. Vui lòng chọn khung giờ khác.',
        isPromotionError: false,
        shouldClearSlot: true,
        shouldRefetchAvailability: true,
        shouldResetStaff: false,
        shouldCloseModal: false,
        shouldRefetchAppointment: false,
        shouldRefetchSource: false,
      };
    case appointmentErrorCodes.staffNotQualified:
    case appointmentErrorCodes.staffNotFound:
    case appointmentErrorCodes.staffNotOnShift:
    case appointmentErrorCodes.staffBusy:
      return {
        code,
        message:
          apiMessage ??
          'Kỹ thuật viên đã chọn hiện không thể nhận lịch này. Vui lòng chọn lại khung giờ hoặc chọn Kỹ thuật viên bất kỳ.',
        isPromotionError: false,
        shouldClearSlot: true,
        shouldRefetchAvailability: true,
        shouldResetStaff: true,
        shouldCloseModal: false,
        shouldRefetchAppointment: false,
        shouldRefetchSource: false,
      };
    case appointmentErrorCodes.sessionTooEarly:
    case appointmentErrorCodes.sessionTooLate:
      return {
        code,
        message:
          apiMessage ??
          'Ngày hẹn không thỏa quy định khoảng cách giữa các buổi trong gói liệu trình.',
        isPromotionError: false,
        shouldClearSlot: true,
        shouldRefetchAvailability: false,
        shouldResetStaff: false,
        shouldCloseModal: false,
        shouldRefetchAppointment: false,
        shouldRefetchSource: false,
      };
    case appointmentErrorCodes.promotionInvalid:
    case appointmentErrorCodes.promotionNotApplicable:
    case appointmentErrorCodes.orderAmountTooSmall:
      return {
        code,
        message:
          apiMessage ?? 'Mã khuyến mãi không hợp lệ hoặc không áp dụng được cho dịch vụ này.',
        isPromotionError: true,
        shouldClearSlot: false,
        shouldRefetchAvailability: false,
        shouldResetStaff: false,
        shouldCloseModal: false,
        shouldRefetchAppointment: false,
        shouldRefetchSource: false,
      };
    case appointmentErrorCodes.entitlementNotEligible:
    case appointmentErrorCodes.entitlementNotFound:
    case appointmentErrorCodes.treatmentSessionNotFound:
    case appointmentErrorCodes.serviceNotFound:
      return {
        code,
        message:
          apiMessage ??
          'Quyền sử dụng dịch vụ hoặc buổi liệu trình không còn khả dụng để đặt lịch.',
        isPromotionError: false,
        shouldClearSlot: false,
        shouldRefetchAvailability: false,
        shouldResetStaff: false,
        shouldCloseModal: false,
        shouldRefetchAppointment: false,
        shouldRefetchSource: true,
      };
    case appointmentErrorCodes.changeWindowPassed:
    case appointmentErrorCodes.appointmentStatusInvalid:
      return {
        code,
        message:
          apiMessage ??
          'Lịch hẹn không còn đủ điều kiện để thay đổi hoặc hủy trực tuyến (cần trước giờ hẹn tối thiểu 24 giờ).',
        isPromotionError: false,
        shouldClearSlot: false,
        shouldRefetchAvailability: false,
        shouldResetStaff: false,
        shouldCloseModal: true,
        shouldRefetchAppointment: true,
        shouldRefetchSource: false,
      };
    case appointmentErrorCodes.appointmentNotFound:
      return {
        code,
        message: apiMessage ?? 'Không tìm thấy lịch hẹn này.',
        isPromotionError: false,
        shouldClearSlot: false,
        shouldRefetchAvailability: false,
        shouldResetStaff: false,
        shouldCloseModal: true,
        shouldRefetchAppointment: true,
        shouldRefetchSource: false,
      };
    default:
      return {
        code,
        message: apiMessage ?? 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.',
        isPromotionError: false,
        shouldClearSlot: false,
        shouldRefetchAvailability: false,
        shouldResetStaff: false,
        shouldCloseModal: false,
        shouldRefetchAppointment: false,
        shouldRefetchSource: false,
      };
  }
}

export function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
