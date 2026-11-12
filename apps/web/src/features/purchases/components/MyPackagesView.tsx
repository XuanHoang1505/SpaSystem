import { SearchIcon, WalletCardsIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderDetailSheet, OrdersBreadcrumb, OrdersErrorState } from '@/features/orders';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import {
  filterPurchases,
  purchaseFilters,
  type PurchaseFilter,
  type PurchaseSort,
} from '../filter';
import { usePurchases } from '../hooks/usePurchases';
import { PackageCard } from './PackageCard';
import { ServiceCard } from './ServiceCard';

const filterLabels: Record<PurchaseFilter, string> = {
  all: 'Tất cả',
  active: 'Đang dùng',
  completed: 'Hoàn thành',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
};
const sortLabels: Record<PurchaseSort, string> = {
  recent: 'Mới nhất',
  expiring: 'Sắp hết hạn',
};

const parseFilter = (value: string | null): PurchaseFilter =>
  purchaseFilters.find((filter) => filter === value) ?? 'all';
const parseSort = (value: string | null): PurchaseSort => (value === 'expiring' ? value : 'recent');

type PurchaseTab = 'packages' | 'services';
const tabLabels: Record<PurchaseTab, string> = {
  packages: 'Gói liệu trình',
  services: 'Dịch vụ đã mua',
};
const emptyTab: Record<PurchaseTab, { title: string; to: string; action: string }> = {
  packages: {
    title: 'Bạn chưa mua gói liệu trình nào',
    to: '/packages',
    action: 'Xem gói liệu trình',
  },
  services: { title: 'Bạn chưa mua dịch vụ lẻ nào', to: '/services', action: 'Khám phá dịch vụ' },
};

const pill = (selected: boolean) =>
  cn(
    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
    selected
      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
      : 'border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
  );

export function MyPackagesView() {
  useDocumentTitle('Gói của tôi');
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get('filter'));
  const tabParam = params.get('tab');
  const sort = parseSort(params.get('sort'));
  const query = params.get('q') ?? '';
  const [text, setText] = useState(query);
  const [viewing, setViewing] = useState<{ id: string; code: string } | null>(null);
  const purchases = usePurchases();

  const tab: PurchaseTab =
    tabParam === 'services' || tabParam === 'packages'
      ? tabParam
      : purchases.data && purchases.data.packages.length === 0 && purchases.data.services.length > 0
        ? 'services'
        : 'packages';

  const update = (next: { filter?: PurchaseFilter; sort?: PurchaseSort; q?: string }) => {
    const merged = { filter, sort, q: query, ...next };
    const out = new URLSearchParams();
    if (tabParam === 'services' || tabParam === 'packages') out.set('tab', tabParam);
    if (merged.filter !== 'all') out.set('filter', merged.filter);
    if (merged.sort !== 'recent') out.set('sort', merged.sort);
    if (merged.q.trim() !== '') out.set('q', merged.q);
    setParams(out, { replace: next.q !== undefined });
  };

  const result = useMemo(
    () =>
      purchases.data
        ? filterPurchases(
            {
              packages: tab === 'packages' ? purchases.data.packages : [],
              services: tab === 'services' ? purchases.data.services : [],
            },
            { filter, query, sort },
          )
        : undefined,
    [purchases.data, tab, filter, query, sort],
  );
  const switchTab = (next: PurchaseTab) => {
    setText('');
    setParams(next === 'packages' ? new URLSearchParams() : new URLSearchParams({ tab: next }));
  };
  const bought = purchases.data
    ? purchases.data.packages.length + purchases.data.services.length
    : 0;

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb
        trail={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản', to: '/account' },
          { label: 'Gói của tôi' },
        ]}
      />
      <PageHeader
        title="Gói của tôi"
        description="Quản lý quyền lợi các gói dịch vụ và dịch vụ lẻ bạn đã sở hữu cùng thời hạn sử dụng."
        className="border-b pb-5"
      />

      {purchases.isPending ? (
        <div data-testid="purchases-skeleton" className="space-y-4">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : purchases.isError ? (
        <OrdersErrorState
          error={purchases.error}
          title="Không tải được danh sách đã mua"
          onRetry={() => void purchases.refetch()}
          retrying={purchases.isFetching}
        />
      ) : bought === 0 ? (
        <EmptyState
          icon={WalletCardsIcon}
          title="Bạn chưa mua dịch vụ hay gói nào"
          description="Dịch vụ và gói liệu trình đã thanh toán sẽ xuất hiện ở đây."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/services">Khám phá dịch vụ</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/packages">Xem gói liệu trình</Link>
              </Button>
            </div>
          }
        />
      ) : (
        result && (
          <>
            <div role="group" aria-label="Loại đã mua" className="flex gap-6 border-b">
              {(Object.keys(tabLabels) as PurchaseTab[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tab === value}
                  onClick={() => switchTab(value)}
                  className={cn(
                    '-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors',
                    tab === value
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {`${tabLabels[value]} (${purchases.data?.[value].length ?? 0})`}
                </button>
              ))}
            </div>
            {result.counts.all === 0 ? (
              <EmptyState
                icon={WalletCardsIcon}
                title={emptyTab[tab].title}
                action={
                  <Button asChild>
                    <Link to={emptyTab[tab].to}>{emptyTab[tab].action}</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <div className="space-y-3 rounded-xl bg-muted/40 p-3.5 sm:p-4">
                  <div
                    role="group"
                    aria-label="Lọc theo trạng thái"
                    className="flex flex-wrap gap-2"
                  >
                    {purchaseFilters.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={filter === value}
                        onClick={() => update({ filter: value })}
                        className={pill(filter === value)}
                      >
                        {`${filterLabels[value]} (${result.counts[value]})`}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative sm:w-72">
                      <SearchIcon
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        aria-label="Tìm theo tên"
                        placeholder="Tìm theo tên"
                        className="bg-card pl-9"
                        value={text}
                        onChange={(event) => {
                          setText(event.target.value);
                          update({ q: event.target.value });
                        }}
                      />
                    </div>
                    <div role="group" aria-label="Sắp xếp" className="flex gap-2">
                      {(Object.keys(sortLabels) as PurchaseSort[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={sort === value}
                          onClick={() => update({ sort: value })}
                          className={pill(sort === value)}
                        >
                          {sortLabels[value]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {result.packages.length === 0 && result.services.length === 0 ? (
                  <EmptyState
                    icon={WalletCardsIcon}
                    title="Không có mục nào phù hợp"
                    action={
                      <Button
                        variant="outline"
                        onClick={() => {
                          setText('');
                          setParams(
                            tab === 'packages'
                              ? new URLSearchParams()
                              : new URLSearchParams({ tab }),
                          );
                        }}
                      >
                        Xem tất cả
                      </Button>
                    }
                  />
                ) : (
                  <section aria-label={tabLabels[tab]} className="space-y-3">
                    {result.packages.map((item) => (
                      <PackageCard key={item.id} item={item} onViewOrder={setViewing} />
                    ))}
                    {result.services.map((item) => (
                      <ServiceCard key={item.id} item={item} onViewOrder={setViewing} />
                    ))}
                  </section>
                )}
              </>
            )}
          </>
        )
      )}

      <OrderDetailSheet order={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}
