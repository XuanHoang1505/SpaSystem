import { useMemo } from 'react';
import { PackageIcon } from 'lucide-react';
import type { PackageSearchParams } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { PriceRangeFilter } from '@/components/shared/PriceRangeFilter/PriceRangeFilter';
import {
  CatalogCard,
  CatalogGrid,
  CatalogPageHeader,
  CatalogSearchBox,
  CatalogSortSelect,
  PriceRangePopover,
  useCatalogListParams,
} from '@/features/services';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { usePackageSearch } from '../hooks/usePackageSearch';

/** SCR-W04 — Tìm kiếm gói dịch vụ (UC-SPA-06). Gói không có danh mục (RS-14): `categoryId` không gửi lên. */
export function PackageSearch() {
  useDocumentTitle('Gói dịch vụ');
  const params = useCatalogListParams();
  const { query: serviceQuery } = params;
  const query = useMemo<PackageSearchParams>(
    () => ({ ...serviceQuery, categoryId: undefined }),
    [serviceQuery],
  );
  const packages = usePackageSearch(query);

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        eyebrow="Gói dịch vụ"
        title="Gói liệu trình"
        description="Các gói nhiều buổi được sắp sẵn theo trình tự, dùng trong thời hạn của gói."
      >
        <CatalogSearchBox
          key={params.search}
          defaultValue={params.search}
          onSearch={params.setSearch}
          placeholder="Tìm gói theo tên…"
          label="Tìm gói dịch vụ"
        />
      </CatalogPageHeader>

      <CatalogGrid
        query={packages}
        getKey={(item) => item.id}
        renderItem={(item) => (
          <CatalogCard
            to={`/packages/${item.id}`}
            name={item.name}
            description={item.shortDescription}
            imageUrl={item.imageUrl}
            fallbackIcon={PackageIcon}
            status={item.status}
            meta={`${item.totalSessions} buổi · Dùng trong ${item.validityDays} ngày`}
            price={item.price}
            footnote={
              item.saleEndDate ? `Mở bán đến ${formatLocalDate(item.saleEndDate)}` : undefined
            }
          />
        )}
        resultLabel={(count) => `${count} gói dịch vụ`}
        emptyTitle="Chưa có gói nào"
        emptyFilteredTitle="Không tìm thấy gói phù hợp"
        hasFilters={params.hasFilters}
        onResetFilters={params.resetFilters}
        onPageChange={params.setPage}
        toolbar={
          <div className="flex flex-wrap items-end gap-3">
            <PriceRangePopover
              className="lg:hidden"
              min={params.minPrice}
              max={params.maxPrice}
              onApply={params.setPriceRange}
              idPrefix="packages-popover"
            />
            <PriceRangeFilter
              className="hidden w-80 lg:grid"
              min={params.minPrice}
              max={params.maxPrice}
              onApply={params.setPriceRange}
              idPrefix="packages-toolbar"
            />
            <CatalogSortSelect value={params.sort} onChange={params.setSort} />
            {params.hasFilters && (
              <Button variant="ghost" onClick={params.resetFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}
