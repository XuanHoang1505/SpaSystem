import { PackageIcon } from 'lucide-react';
import { CatalogCard } from '@/features/services';
import { savingPercent } from '../coursePlan';
import { usePackageSearch } from '../hooks/usePackageSearch';

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
        <h2 id="packages-with-service" className="text-2xl sm:text-3xl">
          Gói liệu trình có dịch vụ này
        </h2>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const saving = savingPercent(item.price, item.retailPrice);
          return (
            <li key={item.id}>
              <CatalogCard
                to={`/packages/${item.id}`}
                name={item.name}
                description={item.shortDescription}
                imageUrl={item.imageUrl}
                fallbackIcon={PackageIcon}
                status={item.status}
                meta={`${item.totalSessions} buổi · Dùng trong ${item.validityDays} ngày`}
                price={item.price}
                footnote={saving > 0 ? `Tiết kiệm ${saving}% so với mua lẻ` : undefined}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
