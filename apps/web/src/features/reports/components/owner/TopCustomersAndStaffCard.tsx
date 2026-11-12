import { useMemo } from 'react';
import { CrownIcon, UserCheckIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOwnerAppointments } from '@/features/bookings';
import { useManagedOrders } from '@/features/orders/hooks/useManagedOrders';
import { formatCurrency, formatNumber } from '@/lib/formatting/formatters';

export interface TopCustomersAndStaffCardProps {
  readonly fromDate: string;
  readonly toDate: string;
}

export function TopCustomersAndStaffCard({ fromDate, toDate }: TopCustomersAndStaffCardProps) {
  // Query paid orders for customer spend aggregation
  const ordersQuery = useManagedOrders({
    status: 'paid',
    fromDate,
    toDate,
    pageSize: 100,
  });

  // Query appointments for staff servicing activity
  const appointmentsQuery = useOwnerAppointments({
    fromDate,
    toDate,
    pageSize: 100,
  });

  // Aggregate top spending customers
  const topCustomers = useMemo(() => {
    const items = ordersQuery.data?.items ?? [];
    const customerMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        totalSpent: number;
        orderCount: number;
      }
    >();

    items.forEach((order) => {
      const customer = order.customer;
      if (!customer?.id) return;
      const existing = customerMap.get(customer.id);
      if (existing) {
        existing.totalSpent += Number(order.grandTotal);
        existing.orderCount += 1;
      } else {
        customerMap.set(customer.id, {
          id: customer.id,
          name: customer.fullName || 'Khách vãng lai',
          phone: customer.phoneNumber || '',
          totalSpent: Number(order.grandTotal),
          orderCount: 1,
        });
      }
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [ordersQuery.data?.items]);

  // Aggregate top active staff
  const topStaff = useMemo(() => {
    const items = appointmentsQuery.data?.items ?? [];
    const staffMap = new Map<
      string,
      {
        id: string;
        name: string;
        completedCount: number;
        totalCount: number;
      }
    >();

    items.forEach((appt) => {
      const staff = appt.staff;
      if (!staff?.id) return;
      const isCompleted = appt.status === 'completed';
      const existing = staffMap.get(staff.id);
      if (existing) {
        existing.totalCount += 1;
        if (isCompleted) existing.completedCount += 1;
      } else {
        staffMap.set(staff.id, {
          id: staff.id,
          name: staff.fullName || 'Kỹ thuật viên',
          completedCount: isCompleted ? 1 : 0,
          totalCount: 1,
        });
      }
    });

    return Array.from(staffMap.values())
      .sort((a, b) => b.completedCount - a.completedCount || b.totalCount - a.totalCount)
      .slice(0, 5);
  }, [appointmentsQuery.data?.items]);

  const maxCustomerSpent = topCustomers[0]?.totalSpent ?? 1;
  const maxStaffAppts = topStaff[0]?.completedCount ?? 1;

  const isLoading = ordersQuery.isLoading || appointmentsQuery.isLoading;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const p1 = parts[parts.length - 2] ?? '';
      const p2 = parts[parts.length - 1] ?? '';
      const c1 = p1.charAt(0);
      const c2 = p2.charAt(0);
      return `${c1}${c2}`.toUpperCase() || 'KH';
    }
    return (name.slice(0, 2) || 'KH').toUpperCase();
  };

  return (
    <Card className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs p-0">
      <CardHeader className="border-b border-border/40 bg-muted/15 px-5 py-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
                Khách hàng VIP & Năng suất Kỹ thuật viên
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Xếp hạng khách hàng theo doanh thu và kỹ thuật viên theo số lượt phục vụ
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList className="rounded-lg bg-muted/70 p-1">
            <TabsTrigger value="customers" className="gap-1.5 text-xs font-medium">
              <CrownIcon className="size-3.5 text-amber-500" />
              <span>Top Khách hàng chi tiêu</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-1.5 text-xs font-medium">
              <UserCheckIcon className="size-3.5 text-emerald-600" />
              <span>Kỹ thuật viên phục vụ</span>
            </TabsTrigger>
          </TabsList>

          {/* Top Customers Tab */}
          <TabsContent value="customers" className="space-y-3 pt-1">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : topCustomers.length === 0 ? (
              <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                Chưa có đơn hàng thanh toán thành công trong kỳ này
              </div>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((c, index) => {
                  const rank = index + 1;
                  const percent = Math.min((c.totalSpent / maxCustomerSpent) * 100, 100);

                  return (
                    <div
                      key={c.id}
                      className="group flex flex-col gap-1.5 rounded-xl border border-border/50 bg-muted/10 p-3 transition-colors hover:border-border hover:bg-muted/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              rank === 1
                                ? 'bg-amber-500/20 text-amber-800 ring-1 ring-amber-500/40 dark:text-amber-300'
                                : rank === 2
                                  ? 'bg-slate-300/40 text-slate-800 ring-1 ring-slate-400/40 dark:text-slate-200'
                                  : rank === 3
                                    ? 'bg-amber-800/15 text-amber-900 ring-1 ring-amber-800/30 dark:text-amber-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            #{rank}
                          </div>

                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {getInitials(c.name)}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {c.name}
                              </span>
                              {rank === 1 && (
                                <span className="py-0.2 inline-flex items-center rounded-full bg-amber-500/15 px-2 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                  VIP 1
                                </span>
                              )}
                            </div>
                            <div className="text-2xs text-muted-foreground">
                              {c.phone ? `${c.phone} • ` : ''}
                              <span className="font-medium text-foreground">
                                {c.orderCount} đơn
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-heading text-sm font-bold text-foreground">
                            {formatCurrency(c.totalSpent)}
                          </div>
                        </div>
                      </div>

                      {/* Spend Ratio Bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/80 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Top Staff Tab */}
          <TabsContent value="staff" className="space-y-3 pt-1">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : topStaff.length === 0 ? (
              <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                Chưa có lịch hẹn hoàn tất nào của nhân viên trong kỳ này
              </div>
            ) : (
              <div className="space-y-3">
                {topStaff.map((s, index) => {
                  const rank = index + 1;
                  const percent = Math.min((s.completedCount / maxStaffAppts) * 100, 100);

                  return (
                    <div
                      key={s.id}
                      className="group flex flex-col gap-1.5 rounded-xl border border-border/50 bg-muted/10 p-3 transition-colors hover:border-border hover:bg-muted/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-medium text-muted-foreground">
                            {rank}
                          </div>

                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {getInitials(s.name)}
                          </div>

                          <div>
                            <span className="text-sm font-semibold text-foreground">{s.name}</span>
                            <div className="text-2xs text-muted-foreground">Kỹ thuật viên</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            {formatNumber(s.completedCount)} lượt phục vụ
                          </span>
                        </div>
                      </div>

                      {/* Productivity Bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
