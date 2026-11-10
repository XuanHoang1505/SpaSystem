import { useQuery } from '@tanstack/react-query';
import { staffQueryKeys } from '@spa/api-client';
import { callStaff } from '@/lib/api/staff';

export function useStaffDetail(id: string | null) {
  return useQuery({
    queryKey: staffQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => callStaff((api) => api.get(id as string, signal)),
    enabled: Boolean(id),
  });
}
