import { useEffect, useMemo, useState } from 'react';
import type { CatalogStatus, PackageListItem, PackageSearchParams } from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { OrdersBreadcrumb } from '@/features/orders';
import { usePackageSearch } from '../../hooks/usePackageSearch';
import { PackageDetailSheet } from './PackageDetailSheet';
import { PackageFilterToolbar } from './PackageFilterToolbar';
import { PackageFormDialog } from './PackageFormDialog';
import { PackageImageDialog } from './PackageImageDialog';
import { PackageTable } from './PackageTable';
import { TogglePackageStatusDialog } from './TogglePackageStatusDialog';

export function OwnerPackagesView() {
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

  const status = (getFilter('status') as CatalogStatus) || '';

  const queryParams = useMemo<PackageSearchParams>(
    () => ({
      pageNumber,
      pageSize,
      search: search || undefined,
      status: status || undefined,
    }),
    [pageNumber, pageSize, search, status],
  );

  const packagesQuery = usePackageSearch(queryParams);

  // Auto adjust page when out of bounds
  useEffect(() => {
    if (
      packagesQuery.data &&
      packagesQuery.data.totalPages > 0 &&
      pageNumber > packagesQuery.data.totalPages
    ) {
      setPage(packagesQuery.data.totalPages, { replace: true });
    }
  }, [packagesQuery.data, pageNumber, setPage]);

  // Dialog & Sheet States
  const [detailPackageId, setDetailPackageId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [imageTarget, setImageTarget] = useState<PackageListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<PackageListItem | null>(null);

  const breadcrumbTrail = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Quản trị spa', to: '/owner' },
    { label: 'Gói dịch vụ' },
  ];

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={breadcrumbTrail} />

      <PageHeader
        title="Quản lý gói dịch vụ"
        description="Quản lý các gói liệu trình nhiều buổi, thời hạn sử dụng, thứ tự thực hiện và chính sách giá ưu đãi."
        className="border-b pb-4"
      />

      <div className="space-y-4 pt-1">
        <PackageFilterToolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={(st) => setFilter('status', st || null)}
          hasFilters={hasFilters}
          onReset={resetFilters}
          onOpenCreate={() => {
            setEditingPackageId(null);
            setFormOpen(true);
          }}
        />

        <PackageTable
          data={packagesQuery.data?.items}
          page={
            packagesQuery.data
              ? {
                  pageNumber: packagesQuery.data.pageNumber,
                  pageSize: packagesQuery.data.pageSize,
                  totalCount: packagesQuery.data.totalCount,
                  totalPages: packagesQuery.data.totalPages,
                }
              : undefined
          }
          isLoading={packagesQuery.isLoading}
          isFetching={packagesQuery.isFetching}
          error={packagesQuery.error ? 'Đã xảy ra lỗi khi tải danh sách gói dịch vụ.' : null}
          onRetry={() => packagesQuery.refetch()}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          onSelectPackage={(pkg) => setDetailPackageId(pkg.id)}
          onEditPackage={(pkg) => {
            setEditingPackageId(pkg.id);
            setFormOpen(true);
          }}
          onChangeImage={(pkg) => setImageTarget(pkg)}
          onToggleStatus={(pkg) => setStatusTarget(pkg)}
        />
      </div>

      {/* Detail Sheet */}
      <PackageDetailSheet
        packageId={detailPackageId}
        onClose={() => setDetailPackageId(null)}
        onEdit={(detail) => {
          setDetailPackageId(null);
          setEditingPackageId(detail.id);
          setFormOpen(true);
        }}
        onChangeImage={(detail) => {
          setImageTarget(detail);
        }}
        onToggleStatus={(detail) => {
          setStatusTarget(detail);
        }}
      />

      {/* Package Form Dialog (Create / Edit) */}
      <PackageFormDialog
        packageId={editingPackageId}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPackageId(null);
        }}
      />

      {/* Image Upload/Delete Dialog */}
      <PackageImageDialog
        pkg={imageTarget}
        open={Boolean(imageTarget)}
        onOpenChange={(open) => !open && setImageTarget(null)}
      />

      {/* Toggle Status Dialog */}
      <TogglePackageStatusDialog
        pkg={statusTarget}
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      />
    </section>
  );
}
