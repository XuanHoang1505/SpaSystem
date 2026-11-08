import { ClockIcon, SparklesIcon } from 'lucide-react';
import { formatDuration } from '@/lib/formatting/formatters';
import { useServiceSearch } from '../hooks/useServiceSearch';
import { CatalogCard } from './CatalogCard';

const LIMIT = 3;

/** "Dịch vụ cùng loại" dưới trang chi tiết: dữ liệu thật từ `GET /services?categoryId=…`. Ẩn khi không có. */
export function RelatedServices({
  categoryId,
  excludeId,
}: {
  categoryId: string;
  excludeId: string;
}) {
  const query = useServiceSearch({
    pageNumber: 1,
    pageSize: LIMIT + 1,
    categoryId,
    sortBy: 'name',
    sortDirection: 'asc',
  });
  const items = (query.data?.items ?? []).filter((item) => item.id !== excludeId).slice(0, LIMIT);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="related-services" className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Gợi ý</p>
        <h2 id="related-services" className="text-2xl sm:text-3xl">
          Dịch vụ cùng loại
        </h2>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <CatalogCard
              to={`/services/${item.id}`}
              name={item.name}
              description={item.shortDescription}
              imageUrl={item.imageUrl}
              fallbackIcon={SparklesIcon}
              status={item.status}
              meta={
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="size-3.5" aria-hidden="true" />
                  {formatDuration(item.durationMinutes)}
                </span>
              }
              price={item.price}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
