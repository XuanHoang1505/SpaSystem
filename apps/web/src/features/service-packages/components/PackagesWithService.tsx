import { usePackageSearch } from '../hooks/usePackageSearch';
import { ServicePackageCard } from './ServicePackageCard';

const LIMIT = 3;

/** "Gói liệu trình có dịch vụ này" trên trang chi tiết dịch vụ (`GET /packages?serviceId=`). Ẩn khi không có. */
export function PackagesWithService({ serviceId }: { serviceId: string }) {
  const query = usePackageSearch({
    pageNumber: 1,
    pageSize: LIMIT,
    serviceId,
    sortBy: 'price',
    sortDirection: 'asc',
  });
  const items = query.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="packages-with-service" className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          Tiết kiệm hơn
        </p>
        <h2 id="packages-with-service" className="font-heading text-2xl font-semibold sm:text-3xl">
          Gói liệu trình có dịch vụ này
        </h2>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <ServicePackageCard pkg={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
