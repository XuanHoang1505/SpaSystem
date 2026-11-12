import { SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCatalogListParams } from '../hooks/useCatalogListParams';
import { useServiceCategories } from '../hooks/useServiceCategories';
import { useServiceSearch } from '../hooks/useServiceSearch';
import { ActiveFilterChips } from './ActiveFilterChips';
import { CatalogGrid } from './CatalogGrid';
import { CatalogPageHeader } from './CatalogPageHeader';
import { CatalogSearchBox } from './CatalogSearchBox';
import { CatalogSortSelect } from './CatalogSortSelect';
import { CatalogTrustStrip } from './CatalogTrustStrip';
import { ServiceCard } from './ServiceCard';
import { ServiceFilterPanel } from './ServiceFilterPanel';

/** SCR-W02 — Tìm kiếm dịch vụ (UC-SPA-06), bố cục theo mẫu Stitch `94728d1f…`. */
export function ServiceSearch() {
  useDocumentTitle('Dịch vụ');
  const params = useCatalogListParams();
  const query = useServiceSearch(params.query);
  const categories = useServiceCategories();
  // Danh mục đang ẩn (vd. mở từ link ở trang chi tiết) không có trong danh sách công khai: vẫn hiện chip để bỏ lọc.
  const categoryName = params.categoryId
    ? (categories.data?.find((category) => category.id === params.categoryId)?.name ??
      (categories.isSuccess ? 'Danh mục đã chọn' : undefined))
    : undefined;
  const filterValue = {
    categoryId: params.categoryId,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
  };

  return (
    <div className="space-y-8">
      <CatalogPageHeader
        band
        breadcrumb="Dịch vụ"
        title="Danh mục dịch vụ chăm sóc da & thư giãn"
        description="Khám phá các liệu trình chăm sóc da và thư giãn tại Như Nguyệt. Chọn theo loại dịch vụ, mức chi phí và thời lượng phù hợp với bạn."
      >
        <CatalogSearchBox
          key={params.search}
          defaultValue={params.search}
          onSearch={params.setSearch}
          placeholder="Tìm dịch vụ…"
          label="Tìm dịch vụ"
        />
      </CatalogPageHeader>

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Bộ lọc">
          <div className="sticky top-24 rounded-xl border bg-card p-5">
            <ServiceFilterPanel
              value={filterValue}
              onApply={params.applyFilters}
              onReset={params.resetFilters}
            />
          </div>
        </aside>

        <CatalogGrid
          query={query}
          getKey={(service) => service.id}
          renderItem={(service) => <ServiceCard service={service} />}
          resultLabel={(count) => (
            <>
              Hiển thị <span className="font-semibold text-primary">{count}</span> dịch vụ
            </>
          )}
          emptyTitle="Chưa có dịch vụ nào"
          emptyFilteredTitle="Không tìm thấy dịch vụ phù hợp"
          hasFilters={params.hasFilters}
          onResetFilters={params.resetFilters}
          onPageChange={params.setPage}
          pager="numbered"
          framedToolbar
          toolbar={
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
              <ActiveFilterChips
                filters={{
                  search: params.search,
                  categoryName,
                  minPrice: params.minPrice,
                  maxPrice: params.maxPrice,
                }}
                onRemove={(key) => {
                  if (key === 'search') params.setSearch('');
                  else if (key === 'category') params.setCategoryId(null);
                  else params.setPriceRange({});
                }}
              />
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="bg-card lg:hidden">
                      <SlidersHorizontalIcon aria-hidden="true" />
                      Bộ lọc
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto p-5">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Bộ lọc dịch vụ</SheetTitle>
                      <SheetDescription>Lọc theo loại dịch vụ và mức chi phí.</SheetDescription>
                    </SheetHeader>
                    <ServiceFilterPanel
                      value={filterValue}
                      onApply={params.applyFilters}
                      onReset={params.resetFilters}
                    />
                  </SheetContent>
                </Sheet>
                <CatalogSortSelect value={params.sort} onChange={params.setSort} />
              </div>
            </div>
          }
        />
      </div>

      <CatalogTrustStrip />
    </div>
  );
}
