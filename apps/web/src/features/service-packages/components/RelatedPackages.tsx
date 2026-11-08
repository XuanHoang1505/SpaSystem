import { PackageIcon } from 'lucide-react';
import { CatalogCard } from '@/features/services';
import { usePackageSearch } from '../hooks/usePackageSearch';

const LIMIT = 3;

/** "Gói khác" dưới trang chi tiết gói: dữ liệu thật từ `GET /packages`. Ẩn khi không có. */
export function RelatedPackages({ excludeId }: { excludeId: string }) {
  const query = usePackageSearch({
    pageNumber: 1,
    pageSize: LIMIT + 1,
    sortBy: 'name',
    sortDirection: 'asc',
  });
  const items = (query.data?.items ?? []).filter((item) => item.id !== excludeId).slice(0, LIMIT);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="related-packages" className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Gợi ý</p>
        <h2 id="related-packages" className="text-2xl sm:text-3xl">
          Gói liệu trình khác
        </h2>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
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
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
