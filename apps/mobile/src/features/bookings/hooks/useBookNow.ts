import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import type { BookNowRequest, BookNowResult } from '@spa/shared-types';
import {
  appointmentsQueryKeys,
  availabilityQueryKeys,
  callAppointments,
} from '@/lib/api/appointments';

export interface BookNowMutationVariables {
  body: BookNowRequest;
  idempotencyKey: string;
}

export function useBookNow() {
  const queryClient = useQueryClient();

  return useMutation<BookNowResult, Error, BookNowMutationVariables>({
    mutationFn: ({ body, idempotencyKey }) =>
      callAppointments((api) => api.bookNow(body, idempotencyKey)),
    onSuccess: (result) => {
      queryClient.setQueryData(
        appointmentsQueryKeys.detail(result.appointment.id),
        result.appointment,
      );
      queryClient.setQueryData(ordersQueryKeys.order(result.order.id), result.order);
      void queryClient.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}
