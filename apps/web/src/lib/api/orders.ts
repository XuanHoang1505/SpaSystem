import { OrderManagementApi, OrdersApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi } from './call';

/** Runs one OrdersApi call on the shared client and returns the envelope's data. */
export function callOrders<T>(call: (api: OrdersApi) => Promise<ApiResponse<T>>): Promise<T> {
  return callApi((client) => new OrdersApi(client), call);
}

/** Runs one OrderManagementApi call (owner, UC-SPA-13) and returns the envelope's data. */
export function callOrderManagement<T>(
  call: (api: OrderManagementApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new OrderManagementApi(client), call);
}
