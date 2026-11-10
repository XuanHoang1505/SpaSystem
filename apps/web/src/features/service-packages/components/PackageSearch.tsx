import { useMemo } from 'react';
import type { PackageSearchParams } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { PriceRangeFilter } from '@/components/shared/PriceRangeFilter/PriceRangeFilter';
import {
  CatalogGrid,
  CatalogPageHeader,
  CatalogSearchBox,
  CatalogSortSelect,
  PriceRangePopover,
  useCatalogListParams,
} from '@/features/services';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePackageSearch } from '../hooks/usePackageSearch';
import { ServicePackageCard } from './ServicePackageCard';
import { PackageTrustStrip } from './PackageTrustStrip';

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
    <div className="space-y-8">
      <CatalogPageHeader
        band
        breadcrumb="Gói dịch vụ"
        title="Gói liệu trình chăm sóc chuyên sâu"
        description="Các gói dịch vụ nhiều buổi được thiết kế theo lộ trình chuẩn y khoa, giúp bạn tiết kiệm chi phí và duy trì hiệu quả làm đẹp bền vững."
      >
        <CatalogSearchBox
          key={params.search}
          defaultValue={params.search}
          onSearch={params.setSearch}
          placeholder="Tìm gói theo tên…"
          label="Tìm gói dịch vụ"
        />
      </CatalogPageHeader>

      <PackageTrustStrip />

      <CatalogGrid
        query={packages}
        getKey={(item) => item.id}
        renderItem={(item) => <ServicePackageCard pkg={item} />}
        resultLabel={(count) => (
          <>
            Hiển thị <span className="font-semibold text-primary">{count}</span> gói liệu trình
          </>
        )}
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
