import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { staffQueryKeys } from '@spa/api-client';
import type { SaveStaffCertificationRequest, StaffCertification } from '@spa/shared-types';
import { ordersRetry } from '@/features/orders';
import {
  callMyCertifications,
  callMyCertificationsVoid,
  callStaffCertifications,
  callStaffCertificationsVoid,
} from '@/lib/api/staff';

/** Lists (pending count), the public staff list and every certification list depend on a write. */
const refreshStaff = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });

/** The writes a certification list needs; owner and staff views pass their own implementation. */
export interface CertificationActions {
  create: (body: SaveStaffCertificationRequest) => Promise<StaffCertification>;
  update: (id: string, body: SaveStaffCertificationRequest) => Promise<StaffCertification>;
  remove: (id: string) => Promise<void>;
  uploadImage: (id: string, file: File) => Promise<StaffCertification>;
  removeImage: (id: string) => Promise<StaffCertification>;
}

// Owner ------------------------------------------------------------------------------------------------------------------

export function useStaffCertifications(staffMemberId: string | null) {
  return useQuery({
    queryKey: staffQueryKeys.certifications(staffMemberId ?? ''),
    queryFn: ({ signal }) =>
      callStaffCertifications((api) => api.list(staffMemberId ?? '', signal)),
    enabled: staffMemberId !== null,
    retry: ordersRetry,
  });
}

export function useOwnerCertificationActions(staffMemberId: string): CertificationActions {
  const queryClient = useQueryClient();
  const after = <T>(promise: Promise<T>) => promise.finally(() => void refreshStaff(queryClient));
  return {
    create: (body) => after(callStaffCertifications((api) => api.create(staffMemberId, body))),
    update: (id, body) =>
      after(callStaffCertifications((api) => api.update(staffMemberId, id, body))),
    remove: (id) => after(callStaffCertificationsVoid((api) => api.remove(staffMemberId, id))),
    uploadImage: (id, file) =>
      after(callStaffCertifications((api) => api.uploadImage(staffMemberId, id, file))),
    removeImage: (id) =>
      after(callStaffCertifications((api) => api.removeImage(staffMemberId, id))),
  };
}

/** BR-STF-14: the owner verifies or rejects (with a reason) a certification. */
export function useReviewCertification(staffMemberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      callStaffCertifications((api) =>
        reason === undefined
          ? api.verify(staffMemberId, id)
          : api.reject(staffMemberId, id, reason),
      ),
    onSettled: () => refreshStaff(queryClient),
  });
}

// Staff (self) -----------------------------------------------------------------------------------------------------------

export function useMyCertifications() {
  return useQuery({
    queryKey: staffQueryKeys.myCertifications(),
    queryFn: ({ signal }) => callMyCertifications((api) => api.list(signal)),
    retry: ordersRetry,
  });
}

export function useMyCertificationActions(): CertificationActions {
  const queryClient = useQueryClient();
  const after = <T>(promise: Promise<T>) => promise.finally(() => void refreshStaff(queryClient));
  return {
    create: (body) => after(callMyCertifications((api) => api.create(body))),
    update: (id, body) => after(callMyCertifications((api) => api.update(id, body))),
    remove: (id) => after(callMyCertificationsVoid((api) => api.remove(id))),
    uploadImage: (id, file) => after(callMyCertifications((api) => api.uploadImage(id, file))),
    removeImage: (id) => after(callMyCertifications((api) => api.removeImage(id))),
  };
}
