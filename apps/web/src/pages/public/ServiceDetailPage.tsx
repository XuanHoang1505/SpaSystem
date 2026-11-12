import { useParams } from 'react-router-dom';
import { NextAvailableSlots } from '@/features/bookings';
import { PackagesWithService } from '@/features/service-packages';
import { ServiceDetailView } from '@/features/services';
import { ServiceStaffList } from '@/features/staff';

export function ServiceDetailPage() {
  const { serviceId = '' } = useParams();
  return (
    <ServiceDetailView
      key={serviceId}
      serviceId={serviceId}
      aside={(service) =>
        service.status === 'on_sale' && <NextAvailableSlots serviceId={service.id} />
      }
      sections={(service) => (
        <>
          <ServiceStaffList serviceId={service.id} />
          <PackagesWithService serviceId={service.id} />
        </>
      )}
    />
  );
}
