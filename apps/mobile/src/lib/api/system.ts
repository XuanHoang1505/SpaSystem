import { ApiClient, SystemApi } from '@spa/api-client';
import { readEnvironment } from '@/config/env';
export function getSystemApi() {
  const environment = readEnvironment();
  return {
    error: environment.error,
    api: environment.apiBaseUrl ? new SystemApi(new ApiClient(environment.apiBaseUrl)) : undefined,
  };
}
