import { useQuery } from '@tanstack/react-query';
import { checkSystemStatus, systemQueryKeys, systemQueryPolicy } from '@spa/api-client';
import { getSystemApi } from '@lib/api/system';

export function useSystemStatus() {
  const { api, error } = getSystemApi();
  const query = useQuery({
    queryKey: systemQueryKeys.status,
    queryFn: ({ signal }) => {
      if (!api) throw new Error(error);
      return checkSystemStatus(api, signal);
    },
    enabled: Boolean(api),
    ...systemQueryPolicy,
  });
  return { ...query, configurationError: error };
}
