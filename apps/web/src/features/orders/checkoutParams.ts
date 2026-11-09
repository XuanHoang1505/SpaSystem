import type { OrderRequest } from '@spa/shared-types';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CheckoutParams =
  | { ok: true; mode: 'prepare'; request: OrderRequest }
  | { ok: true; mode: 'existing'; orderId: string }
  | { ok: false };

/** Reads `/checkout` query: `source=cart`, `source=buy_now&serviceId|packageId`, or `orderId` (docs/specs/orders.md). */
export function parseCheckoutParams(search: URLSearchParams): CheckoutParams {
  const orderId = search.get('orderId');
  if (orderId !== null)
    return GUID.test(orderId) ? { ok: true, mode: 'existing', orderId } : { ok: false };

  const source = search.get('source');
  const serviceId = search.get('serviceId');
  const packageId = search.get('packageId');
  if (source === 'cart')
    return serviceId === null && packageId === null
      ? { ok: true, mode: 'prepare', request: { source: 'cart' } }
      : { ok: false };
  if (source === 'buy_now' && (serviceId === null) !== (packageId === null)) {
    if (serviceId !== null && GUID.test(serviceId))
      return { ok: true, mode: 'prepare', request: { source: 'buy_now', spaServiceId: serviceId } };
    if (packageId !== null && GUID.test(packageId))
      return {
        ok: true,
        mode: 'prepare',
        request: { source: 'buy_now', servicePackageId: packageId },
      };
  }
  return { ok: false };
}

export function checkoutPath(target: OrderRequest | { orderId: string }): string {
  if ('orderId' in target) return `/checkout?orderId=${target.orderId}`;
  if (target.source === 'cart') return '/checkout?source=cart';
  return target.servicePackageId
    ? `/checkout?source=buy_now&packageId=${target.servicePackageId}`
    : `/checkout?source=buy_now&serviceId=${target.spaServiceId ?? ''}`;
}
