import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { OrdersBreadcrumb } from '@/features/orders';
import { useAuthStore } from '@/stores/authStore';
import { useMyCertificationActions, useMyCertifications } from '../../hooks/useStaffCertifications';
import { CertificationList } from './CertificationList';

/** `/staff/certifications`: the staff member declares their own certifications, the owner reviews them (BR-STF-14). */
export function MyCertificationsView() {
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const query = useMyCertifications();
  const actions = useMyCertificationActions();

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
      <OrdersBreadcrumb trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Bằng cấp của tôi' }]} />
      <PageHeader
        title="Bằng cấp của tôi"
        description="Bằng bạn thêm hoặc sửa sẽ chờ chủ spa duyệt trước khi hiển thị cho khách."
        className="border-b pb-4"
      />
      <div className="max-w-3xl">
        <CertificationList mode="self" staffMemberId={userId} query={query} actions={actions} />
      </div>
    </section>
  );
}
