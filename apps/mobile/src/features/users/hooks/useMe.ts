import { useQuery } from '@tanstack/react-query';
import { callUsers, usersQueryKeys } from '@/lib/api/users';

export function useMe() {
  return useQuery({
    queryKey: usersQueryKeys.me(),
    queryFn: () => callUsers((api) => api.getMe()),
  });
}
