import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  availabilityQueryKeys,
  ownerAppointmentsQueryKeys,
  staffQueryKeys,
  workSchedulesQueryKeys,
} from '@spa/api-client';
import type {
  CreateStaffRequest,
  ResignStaffRequest,
  UpdateStaffRequest,
  UpdateStaffServicesRequest,
} from '@spa/shared-types';
import { callStaff, callStaffVoid } from '@/lib/api/staff';

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStaffRequest) => callStaff((api) => api.create(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStaffRequest }) =>
      callStaff((api) => api.update(id, body)),
    onSuccess: (detail, { id }) => {
      queryClient.setQueryData(staffQueryKeys.detail(id), detail);
      queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
    },
  });
}

export function useUpdateStaffServices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStaffServicesRequest }) =>
      callStaffVoid((api) => api.updateServices(id, body)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: staffQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}

export function useResignStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResignStaffRequest }) =>
      callStaff((api) => api.resign(id, body)),
    onSuccess: (result, { id }) => {
      queryClient.setQueryData(staffQueryKeys.detail(id), result.staff);
      queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: workSchedulesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ownerAppointmentsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}
