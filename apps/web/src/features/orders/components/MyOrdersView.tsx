import { ReceiptTextIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { MyOrderListItem, OrderStatus } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { SimplePager } from '@/components/shared/SimplePager/SimplePager';
import { FormField } from '@/components/shared/FormField/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import { useMyOrders } from '../hooks/useMyOrders';
import { orderStatusBadge } from '../orderStatus';
import { CancelOrderDialog } from './CancelOrderDialog';
import { OrderCard } from './OrderCard';
import { OrderDetailSheet } from './OrderDetailSheet';
import { OrdersBreadcrumb } from './OrdersBreadcrumb';
import { OrdersErrorState } from './OrdersErrorState';

const PAGE_SIZE = 10;
const statuses: readonly OrderStatus[] = ['pending_payment', 'paid', 'expired', 'cancelled'];

const parseStatus = (value: string | null): OrderStatus | undefined =>
  statuses.find((status) => status === value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const parseDate = (value: string | null) => (value && DATE.test(value) ? value : undefined);
const parsePage = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/** SCR-W19 — Đơn hàng của tôi (UC-SPA-12): filter by status (server side, in the URL), detail, pay again, cancel. */
export function MyOrdersView() {
  useDocumentTitle('Đơn hàng của tôi');
  const [search, setSearch] = useSearchParams();
  const status = parseStatus(search.get('status'));
  const pageNumber = parsePage(search.get('page'));
  const fromDate = parseDate(search.get('fromDate'));
  const toDate = parseDate(search.get('toDate'));
  const query = useMyOrders({ status, fromDate, toDate, pageNumber, pageSize: PAGE_SIZE });
  // What the date inputs show: a range that ends before it starts is kept here, explained, and not sent.
  const [draft, setDraft] = useState({ from: fromDate ?? '', to: toDate ?? '' });
  useEffect(() => setDraft({ from: fromDate ?? '', to: toDate ?? '' }), [fromDate, toDate]);
  const rangeError =
    draft.from && draft.to && draft.to < draft.from
      ? 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.'
      : undefined;
  const filtered = Boolean(status || fromDate || toDate);
  const [viewing, setViewing] = useState<MyOrderListItem | null>(null);
  const [cancelling, setCancelling] = useState<MyOrderListItem | null>(null);
  const data = query.data;

  const update = (next: {
    status?: OrderStatus;
    fromDate?: string;
    toDate?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    if (next.status) params.set('status', next.status);
    if (next.fromDate) params.set('fromDate', next.fromDate);
    if (next.toDate) params.set('toDate', next.toDate);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    setSearch(params);
  };
  const changeDate = (key: 'from' | 'to', value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (next.from && next.to && next.to < next.from) return;
    update({ status, fromDate: next.from || undefined, toDate: next.to || undefined });
  };

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb
        trail={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản', to: '/account' },
          { label: 'Đơn hàng của bạn' },
        ]}
      />
      <PageHeader
        title="Đơn hàng của bạn"
        description="Theo dõi, thanh toán hoặc hủy các đơn bạn đã đặt."
        className="border-b pb-5"
      />
      <div className="flex flex-col gap-3.5 rounded-xl bg-muted/40 p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Lọc theo trạng thái"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2"
        >
          {[undefined, ...statuses].map((value) => (
            <button
              key={value ?? 'all'}
              type="button"
              aria-pressed={status === value}
              onClick={() => update({ status: value, fromDate, toDate })}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                status === value
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {value ? orderStatusBadge(value).label : 'Tất cả'}
            </button>
          ))}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 lg:w-[19rem]">
          <FormField label="Từ ngày">
            <Input
              type="date"
              className="h-9 bg-card text-xs sm:text-sm"
              value={draft.from}
              onChange={(event) => changeDate('from', event.target.value)}
            />
          </FormField>
          <FormField label="Đến ngày" error={rangeError}>
            <Input
              type="date"
              className="h-9 bg-card text-xs sm:text-sm"
              value={draft.to}
              onChange={(event) => changeDate('to', event.target.value)}
            />
          </FormField>
        </div>
      </div>

      {query.isPending ? (
        <div data-testid="orders-skeleton" className="space-y-4">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <OrdersErrorState
          error={query.error}
          title="Không tải được danh sách đơn hàng"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : data && data.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={ReceiptTextIcon}
            title="Không có đơn hàng nào phù hợp"
            action={
              <Button variant="outline" onClick={() => update({})}>
                Xem tất cả đơn
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ReceiptTextIcon}
            title="Bạn chưa có đơn hàng nào"
            description="Đơn hàng sẽ xuất hiện ở đây sau khi bạn đặt mua dịch vụ hoặc gói liệu trình."
            action={
              <Button asChild>
                <Link to="/services">Khám phá dịch vụ</Link>
              </Button>
            }
          />
        )
      ) : (
        data && (
          <div aria-busy={query.isPlaceholderData} className="space-y-3">
            {data.items.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onView={setViewing}
                onCancel={setCancelling}
              />
            ))}
            <SimplePager
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              onPageChange={(page) => update({ status, fromDate, toDate, page })}
            />
          </div>
        )
      )}

      <OrderDetailSheet order={viewing} onClose={() => setViewing(null)} />
      <CancelOrderDialog order={cancelling} onClose={() => setCancelling(null)} />
    </section>
  );
}
