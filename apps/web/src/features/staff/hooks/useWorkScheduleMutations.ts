import { useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityQueryKeys, workSchedulesQueryKeys } from '@spa/api-client';
import type {
  ChangeWorkScheduleStatusRequest,
  CreateWorkScheduleBatchRequest,
  CreateWorkScheduleRequest,
  UpdateWorkScheduleRequest,
} from '@spa/shared-types';
import { callWorkSchedules, callWorkSchedulesVoid } from '@/lib/api/workSchedules';

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkScheduleRequest) => callWorkSchedules((api) => api.create(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workSchedulesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}

export function useCreateBatchShifts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkScheduleBatchRequest) =>
      callWorkSchedules((api) => api.createBatch(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workSchedulesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateWorkScheduleRequest }) =>
      callWorkSchedules((api) => api.update(id, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workSchedulesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}

export function useCancelShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChangeWorkScheduleStatusRequest }) =>
      callWorkSchedulesVoid((api) => api.changeStatus(id, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workSchedulesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}
