import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppointmentListParams } from '@spa/shared-types';
import { callOwnerAppointments, ownerAppointmentsQueryKeys } from '@/lib/api/owner';

/** Every appointment of one day for the owner (UC-SPA-17), at most one page of 100. */
export function useOwnerAppointments(params: AppointmentListParams) {
  return useQuery({
    queryKey: ownerAppointmentsQueryKeys.list(params),
    queryFn: ({ signal }) => callOwnerAppointments((api) => api.list(params, signal)),
    retry: 1,
  });
}

export function useOwnerAppointment(id: string | null) {
  return useQuery({
    queryKey: ownerAppointmentsQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => callOwnerAppointments((api) => api.get(id ?? '', signal)),
    enabled: Boolean(id),
    retry: 1,
  });
}

export type OwnerAppointmentAction =
  | { type: 'confirm'; id: string }
  | { type: 'cancel'; id: string; reason: string }
  | { type: 'no_show'; id: string };

/** Confirm, cancel or mark a no-show; the list and the detail reload afterwards. */
export function useOwnerAppointmentAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: OwnerAppointmentAction) =>
      callOwnerAppointments((api) => {
        if (action.type === 'confirm') return api.confirm(action.id);
        if (action.type === 'cancel') return api.cancel(action.id, action.reason);
        return api.markNoShow(action.id);
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerAppointmentsQueryKeys.all }),
  });
}
