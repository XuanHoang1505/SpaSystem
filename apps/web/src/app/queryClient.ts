import { QueryClient } from '@tanstack/react-query';
import { systemQueryPolicy } from '@spa/api-client';
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { ...systemQueryPolicy, refetchOnWindowFocus: false } },
  });
