import {
  CalendarClockIcon,
  PackageIcon,
  PhoneIcon,
  SparklesIcon,
  StickyNoteIcon,
  UserIcon,
} from 'lucide-react';
import type { AppointmentDetail } from '@spa/shared-types';
import { InfoTile } from '@/components/shared/InfoTile/InfoTile';
import { formatLocalTime } from '@/lib/formatting/formatters';
import { formatLongDate } from '@/lib/formatting/vietnamTime';
import { AllergyList } from './AllergyList';

/** Tab "Khách & dị ứng": who, what and when, then the customer's allergies. */
export function CustomerCareTab({ appointment }: { appointment: AppointmentDetail }) {
  const { customer, service, treatmentSession } = appointment;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile icon={UserIcon} label="Khách" value={customer.fullName} />
        <InfoTile
          icon={PhoneIcon}
          label="Số điện thoại"
          value={
            <a href={`tel:${customer.phoneNumber}`} className="text-primary hover:underline">
              {customer.phoneNumber}
            </a>
          }
        />
        <InfoTile icon={SparklesIcon} label="Dịch vụ" value={service.name} />
        <InfoTile
          icon={CalendarClockIcon}
          label="Ngày giờ"
          value={`${formatLongDate(appointment.date)} · ${formatLocalTime(appointment.startTime)} – ${formatLocalTime(appointment.endTime)}`}
        />
        {treatmentSession && (
          <InfoTile
            icon={PackageIcon}
            label="Buổi trong gói"
            value={`Buổi ${treatmentSession.sequenceNumber}/${treatmentSession.totalSessions} · ${treatmentSession.packageName}`}
          />
        )}
        {appointment.note && (
          <InfoTile
            icon={StickyNoteIcon}
            label="Ghi chú lịch hẹn"
            value={<span className="break-words whitespace-pre-line">{appointment.note}</span>}
            className="sm:col-span-2"
          />
        )}
      </div>

      <AllergyList customerId={customer.id} appointmentId={appointment.id} />
    </div>
  );
}
