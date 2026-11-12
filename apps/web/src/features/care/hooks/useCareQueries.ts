import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { careQueryKeys } from '@spa/api-client';
import type { AssignedAppointmentListParams, CareHistoryParams } from '@spa/shared-types';
import { ordersRetry } from '@/features/orders';
import { callCare } from '@/lib/api/care';

/** SCR-W26: the signed-in staff member's appointments; `null` (invalid filter) sends nothing. */
export function useAssignedAppointments(params: AssignedAppointmentListParams | null) {
  return useQuery({
    queryKey: careQueryKeys.assigned(params ?? { fromDate: '', toDate: '' }),
    queryFn: ({ signal }) =>
      callCare((api) => api.listAssigned(params ?? { fromDate: '', toDate: '' }, signal)),
    enabled: params !== null,
    retry: ordersRetry,
  });
}

/** SCR-W27: one assigned appointment (`GET /appointments/{id}`). */
export function useCareAppointment(id: string) {
  return useQuery({
    queryKey: careQueryKeys.appointment(id),
    queryFn: ({ signal }) => callCare((api) => api.getAppointment(id, signal)),
    retry: ordersRetry,
  });
}

/** The skin profile of a visit; only asked for when the appointment says one exists (no 404 round trip). */
export function useSkinProfile(appointmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: careQueryKeys.skinProfile(appointmentId),
    queryFn: ({ signal }) => callCare((api) => api.getSkinProfile(appointmentId, signal)),
    enabled,
    retry: ordersRetry,
  });
}

/** The customer's allergies (BR-CARE-02 order from the server). */
export function useCustomerAllergies(customerId: string | null) {
  return useQuery({
    queryKey: careQueryKeys.allergies(customerId ?? ''),
    queryFn: ({ signal }) => callCare((api) => api.listAllergies(customerId ?? '', signal)),
    enabled: customerId !== null,
    retry: ordersRetry,
  });
}

/** SCR-W28: the visits the staff member completed; `null` (invalid filter) sends nothing. */
export function useCareHistory(params: CareHistoryParams | null) {
  return useQuery({
    queryKey: careQueryKeys.history(params ?? {}),
    queryFn: ({ signal }) => callCare((api) => api.listHistory(params ?? {}, signal)),
    enabled: params !== null,
    retry: ordersRetry,
    placeholderData: keepPreviousData,
  });
}
