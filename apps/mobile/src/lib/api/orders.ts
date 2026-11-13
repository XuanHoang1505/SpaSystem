import { OrdersApi, ordersQueryKeys } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

/**
 * Access the shared OrdersApi instance for mobile.
 * Uses the shared ApiClient with authentication headers attached if the user has an active session.
 */
export function getOrdersApi(): { api?: OrdersApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new OrdersApi(client) } : { error };
}

/** Runs one OrdersApi call and returns the unwrapped data payload. */
export async function callOrders<T>(
  call: (api: OrdersApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getOrdersApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

export { ordersQueryKeys };
