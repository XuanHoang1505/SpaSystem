import type {
  CustomerPackageStatus,
  EntitlementStatus,
  PurchasedPackage,
  PurchasedService,
  Purchases,
} from '@spa/shared-types';
import { foldText } from '@/lib/text';

export type PurchaseFilter = 'all' | 'active' | 'completed' | 'expired' | 'cancelled';
export type PurchaseSort = 'recent' | 'expiring';

export const purchaseFilters: readonly PurchaseFilter[] = [
  'all',
  'active',
  'completed',
  'expired',
  'cancelled',
];

const DAY_MS = 24 * 60 * 60 * 1000;

const packageGroup: Record<CustomerPackageStatus, Exclude<PurchaseFilter, 'all'>> = {
  active: 'active',
  completed: 'completed',
  expired: 'expired',
  cancelled: 'cancelled',
};
const serviceGroup: Record<EntitlementStatus, Exclude<PurchaseFilter, 'all'>> = {
  available: 'active',
  booked: 'active',
  used: 'completed',
  expired: 'expired',
};

export interface FilteredPurchases {
  packages: PurchasedPackage[];
  services: PurchasedService[];
  counts: Record<PurchaseFilter, number>;
}

/** Whole days left until the expiry (rounded up, never below 0); null when it never expires. */
export function daysLeft(expiresAtUtc: string | null, now: Date = new Date()): number | null {
  if (expiresAtUtc === null) return null;
  return Math.max(0, Math.ceil((new Date(expiresAtUtc).getTime() - now.getTime()) / DAY_MS));
}

const byRecent = (a: { purchasedAtUtc: string }, b: { purchasedAtUtc: string }) =>
  b.purchasedAtUtc.localeCompare(a.purchasedAtUtc);

const byExpiry = (a: { expiresAtUtc: string | null }, b: { expiresAtUtc: string | null }) => {
  if (a.expiresAtUtc === b.expiresAtUtc) return 0;
  if (a.expiresAtUtc === null) return 1;
  if (b.expiresAtUtc === null) return -1;
  return a.expiresAtUtc.localeCompare(b.expiresAtUtc);
};

/** Chip counts ignore the search and the chip itself; the lists apply both, then the sort (stable). */
export function filterPurchases(
  purchases: Purchases,
  options: { filter: PurchaseFilter; query: string; sort: PurchaseSort },
): FilteredPurchases {
  const counts: Record<PurchaseFilter, number> = {
    all: purchases.packages.length + purchases.services.length,
    active: 0,
    completed: 0,
    expired: 0,
    cancelled: 0,
  };
  for (const item of purchases.packages) counts[packageGroup[item.status]] += 1;
  for (const item of purchases.services) counts[serviceGroup[item.status]] += 1;

  const query = foldText(options.query);
  const compare = options.sort === 'expiring' ? byExpiry : byRecent;
  const matches = (group: PurchaseFilter, name: string) =>
    (options.filter === 'all' || group === options.filter) &&
    (query === '' || foldText(name).includes(query));

  return {
    packages: purchases.packages
      .filter((item) => matches(packageGroup[item.status], item.packageName))
      .sort(compare),
    services: purchases.services
      .filter((item) => matches(serviceGroup[item.status], item.serviceName))
      .sort(compare),
    counts,
  };
}
