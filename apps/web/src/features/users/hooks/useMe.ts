import { useQuery } from '@tanstack/react-query';
import { usersQueryKeys } from '@spa/api-client';
import { callUsers } from '@/lib/api/users';

export function useMe(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.me(),
    queryFn: () => callUsers((api) => api.getMe()),
    enabled,
  });
}
