import { useEffect, useMemo, useState } from 'react';
import type { CatalogStatus, ServiceListItem, ServiceSearchParams } from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { OrdersBreadcrumb } from '@/features/orders';
import { useServiceSearch } from '../../hooks/useServiceSearch';
import { ServiceCategoriesDialog } from './ServiceCategoriesDialog';
import { ServiceDetailSheet } from './ServiceDetailSheet';
import { ServiceFilterToolbar } from './ServiceFilterToolbar';
import { ServiceFormDialog } from './ServiceFormDialog';
import { ServiceImageDialog } from './ServiceImageDialog';
import { ServiceTable } from './ServiceTable';
import { ToggleServiceStatusDialog } from './ToggleServiceStatusDialog';

export function OwnerServicesView() {
  const {
    pageNumber,
    pageSize,
    search,
    setSearch,
    setPage,
    setPageSize,
    getFilter,
    setFilter,
    resetFilters,
    hasFilters,
  } = useTableSearchParams({ defaultPageSize: 10 });

  const categoryId = getFilter('categoryId');
  const status = (getFilter('status') as CatalogStatus) || '';

  // Query parameters
  const queryParams = useMemo<ServiceSearchParams>(
    () => ({
      pageNumber,
      pageSize,
      search: search || undefined,
      categoryId: categoryId || undefined,
      status: status || undefined,
    }),
    [pageNumber, pageSize, search, categoryId, status],
  );

  const servicesQuery = useServiceSearch(queryParams);

  // Auto adjust page when out of bounds
  useEffect(() => {
    if (
      servicesQuery.data &&
      servicesQuery.data.totalPages > 0 &&
      pageNumber > servicesQuery.data.totalPages
    ) {
      setPage(servicesQuery.data.totalPages, { replace: true });
    }
  }, [servicesQuery.data, pageNumber, setPage]);

  // Dialog & Sheet States
  const [detailServiceId, setDetailServiceId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [imageTarget, setImageTarget] = useState<ServiceListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<ServiceListItem | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const breadcrumbTrail = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Quản trị spa', to: '/owner' },
    { label: 'Dịch vụ & danh mục' },
  ];

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={breadcrumbTrail} />

      <PageHeader
        title="Quản lý dịch vụ & danh mục"
        description="Quản lý danh sách dịch vụ spa, quy trình thực hiện, giá niêm yết và danh mục phân loại."
        className="border-b pb-4"
      />

      <div className="space-y-4 pt-1">
        <ServiceFilterToolbar
          search={search}
          onSearchChange={setSearch}
          categoryId={categoryId}
          onCategoryIdChange={(catId) => setFilter('categoryId', catId || null)}
          status={status}
          onStatusChange={(st) => setFilter('status', st || null)}
          hasFilters={hasFilters}
          onReset={resetFilters}
          onOpenCreate={() => {
            setEditingServiceId(null);
            setFormOpen(true);
          }}
          onOpenCategories={() => setCategoriesOpen(true)}
        />

        <ServiceTable
          data={servicesQuery.data?.items}
          page={
            servicesQuery.data
              ? {
                  pageNumber: servicesQuery.data.pageNumber,
                  pageSize: servicesQuery.data.pageSize,
                  totalCount: servicesQuery.data.totalCount,
                  totalPages: servicesQuery.data.totalPages,
                }
              : undefined
          }
          isLoading={servicesQuery.isLoading}
          isFetching={servicesQuery.isFetching}
          error={servicesQuery.error ? 'Đã xảy ra lỗi khi tải danh sách dịch vụ.' : null}
          onRetry={() => servicesQuery.refetch()}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          onSelectService={(svc) => setDetailServiceId(svc.id)}
          onEditService={(svc) => {
            setEditingServiceId(svc.id);
            setFormOpen(true);
          }}
          onChangeImage={(svc) => setImageTarget(svc)}
          onToggleStatus={(svc) => setStatusTarget(svc)}
        />
      </div>

      {/* Detail Sheet */}
      <ServiceDetailSheet
        serviceId={detailServiceId}
        onClose={() => setDetailServiceId(null)}
        onEdit={(detail) => {
          setDetailServiceId(null);
          setEditingServiceId(detail.id);
          setFormOpen(true);
        }}
        onChangeImage={(detail) => {
          setImageTarget(detail);
        }}
        onToggleStatus={(detail) => {
          setStatusTarget(detail);
        }}
      />

      {/* Service Form Dialog (Create / Edit) */}
      <ServiceFormDialog
        serviceId={editingServiceId}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingServiceId(null);
        }}
      />

      {/* Image Upload/Delete Dialog */}
      <ServiceImageDialog
        service={imageTarget}
        open={Boolean(imageTarget)}
        onOpenChange={(open) => !open && setImageTarget(null)}
      />

      {/* Toggle Status Confirmation Dialog */}
      <ToggleServiceStatusDialog
        service={statusTarget}
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      />

      {/* Service Categories Management Dialog */}
      <ServiceCategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
      />
    </section>
  );
}
