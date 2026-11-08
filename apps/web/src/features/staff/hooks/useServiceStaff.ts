import { useQuery } from '@tanstack/react-query';
import { StaffApi, staffQueryKeys } from '@spa/api-client';
import { catalogRetry, useCatalogQueryEnabled } from '@/features/services';
import { callApi } from '@/lib/api/call';

const LIMIT = 6;

/** Nhân viên đang làm việc có kỹ năng thực hiện dịch vụ (`GET /staff?spaServiceId=`, không có thông tin liên hệ). */
export function useServiceStaff(spaServiceId: string) {
  const enabled = useCatalogQueryEnabled();
  return useQuery({
    queryKey: staffQueryKeys.publicByService(spaServiceId),
    queryFn: ({ signal }) =>
      callApi(
        (client) => new StaffApi(client),
        (api) => api.listPublic({ spaServiceId, pageSize: LIMIT }, signal),
      ),
    retry: catalogRetry,
    enabled,
  });
}
