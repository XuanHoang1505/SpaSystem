import { useState } from 'react';
import { CheckCircle2Icon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader/PageLoader';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { OrdersBreadcrumb } from '@/features/orders';
import { formatLocalTime } from '@/lib/formatting/formatters';
import { formatLongDate } from '@/lib/formatting/vietnamTime';
import { careErrorKind, careErrorMessage } from '../errors';
import { useCareAppointment } from '../hooks/useCareQueries';
import { AllergyHighlight } from './AllergyHighlight';
import { CareResultTab } from './CareResultTab';
import { CompleteAppointmentDialog } from './CompleteAppointmentDialog';
import { CustomerCareTab } from './CustomerCareTab';
import { SkinProfileTab } from './SkinProfileTab';

const careTabs = ['customer', 'skin-profile', 'result'] as const;
export type CareTab = (typeof careTabs)[number];
const isCareTab = (value: string | null): value is CareTab =>
  (careTabs as readonly (string | null)[]).includes(value);

const listPath = '/staff/bookings';

/** SCR-W27 (UC-SPA-25, 27, 28): one assigned visit with its customer, allergies, skin profile and result. */
export function StaffAppointmentDetailView({ appointmentId }: { appointmentId: string }) {
  const query = useCareAppointment(appointmentId);
  const [completing, setCompleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: CareTab = isCareTab(rawTab) ? rawTab : 'customer';
  const setTab = (next: CareTab) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'customer') params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true },
    );

  if (query.isLoading) return <PageLoader label="Đang tải buổi chăm sóc…" />;

  if (query.isError || !query.data) {
    const kind = careErrorKind(query.error);
    const known = kind === 'not_found' || kind === 'not_assigned';
    return (
      <section className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
        <ErrorState
          title={
            kind === 'not_found'
              ? 'Không tìm thấy lịch hẹn'
              : kind === 'not_assigned'
                ? 'Lịch này không được phân công cho bạn'
                : 'Không tải được buổi chăm sóc'
          }
          message={known ? undefined : careErrorMessage(query.error)}
          onRetry={known ? undefined : () => void query.refetch()}
          retrying={query.isFetching}
        />
        <div className="flex justify-center">
          <Button asChild variant="link">
            <Link to={listPath}>Về danh sách lịch hẹn</Link>
          </Button>
        </div>
      </section>
    );
  }

  const appointment = query.data;
  const badge = appointmentStatusBadge(appointment.status);

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
      <OrdersBreadcrumb
        trail={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Lịch hẹn được phân công', to: listPath },
          { label: 'Buổi chăm sóc' },
        ]}
      />

      <PageHeader
        eyebrow="Buổi chăm sóc"
        title={appointment.service.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{`${formatLongDate(appointment.date)} · ${formatLocalTime(appointment.startTime)} – ${formatLocalTime(appointment.endTime)}`}</span>
            <StatusBadge label={badge.label} tone={badge.tone} status={appointment.status} />
          </span>
        }
        className="border-b pb-4"
        actions={
          appointment.status === 'confirmed' && (
            <Button type="button" onClick={() => setCompleting(true)}>
              <CheckCircle2Icon aria-hidden="true" />
              Xác nhận hoàn thành
            </Button>
          )
        }
      />

      <AllergyHighlight allergies={appointment.allergies} />

      <Tabs
        value={tab}
        onValueChange={(value) => isCareTab(value) && setTab(value)}
        className="space-y-4"
      >
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="customer">Khách & dị ứng</TabsTrigger>
            <TabsTrigger value="skin-profile">Hồ sơ da</TabsTrigger>
            <TabsTrigger value="result">Kết quả buổi</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="customer">
          <CustomerCareTab appointment={appointment} />
        </TabsContent>
        <TabsContent value="skin-profile">
          <SkinProfileTab appointment={appointment} />
        </TabsContent>
        <TabsContent value="result">
          <CareResultTab appointment={appointment} onComplete={() => setCompleting(true)} />
        </TabsContent>
      </Tabs>

      <CompleteAppointmentDialog
        appointment={completing ? appointment : null}
        onClose={() => setCompleting(false)}
        onNeedSkinProfile={() => setTab('skin-profile')}
      />
    </section>
  );
}
