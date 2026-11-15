import { useQuery } from '@tanstack/react-query';
import { careQueryKeys } from '@spa/api-client';
import { bookingsRetry } from '@/features/bookings/hooks/bookingsRetry';
import { callCare } from '@/lib/api/care';

/** SCR-M26: fetch details for one assigned appointment (`GET /appointments/{id}`). */
export function useCareAppointment(id: string) {
  return useQuery({
    queryKey: careQueryKeys.appointment(id),
    queryFn: ({ signal }) => callCare((api) => api.getAppointment(id, signal)),
    enabled: Boolean(id),
    retry: bookingsRetry,
  });
}

/** The skin profile of a visit; only fetched when the appointment says one exists (`skinProfileId != null`). */
export function useSkinProfile(appointmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: careQueryKeys.skinProfile(appointmentId),
    queryFn: ({ signal }) => callCare((api) => api.getSkinProfile(appointmentId, signal)),
    enabled: enabled && Boolean(appointmentId),
    retry: bookingsRetry,
  });
}

/** The customer's allergies (BR-CARE-02 ordered from the server). */
export function useCustomerAllergies(customerId: string | null | undefined) {
  return useQuery({
    queryKey: careQueryKeys.allergies(customerId ?? ''),
    queryFn: ({ signal }) => callCare((api) => api.listAllergies(customerId ?? '', signal)),
    enabled: Boolean(customerId),
    retry: bookingsRetry,
  });
}
