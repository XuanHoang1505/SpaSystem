import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AssignTreatmentStaffRequest,
  TreatmentPlanDto,
  TreatmentReasonRequest,
  TreatmentSessionDto,
  UpdateTreatmentPlanRequest,
  UpdateTreatmentSessionRequest,
} from '@spa/shared-types';
import { callOwnerTreatments } from '@/lib/api/treatments';
import { treatmentManageQueryKeys } from '../treatmentQueryKeys';

export function useUpdateTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTreatmentPlanRequest }) =>
      callOwnerTreatments((api) => api.update(id, body)),
    onSuccess: (updated: TreatmentPlanDto, { id }) => {
      queryClient.setQueryData(treatmentManageQueryKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.detail(id) });
    },
  });
}

export function useAssignTreatmentStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AssignTreatmentStaffRequest }) =>
      callOwnerTreatments((api) => api.assignStaff(id, body)),
    onSuccess: (updated: TreatmentPlanDto, { id }) => {
      queryClient.setQueryData(treatmentManageQueryKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.detail(id) });
    },
  });
}

export function usePauseTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TreatmentReasonRequest }) =>
      callOwnerTreatments((api) => api.pause(id, body)),
    onSuccess: (updated: TreatmentPlanDto, { id }) => {
      queryClient.setQueryData(treatmentManageQueryKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.detail(id) });
    },
  });
}

export function useResumeTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callOwnerTreatments((api) => api.resume(id)),
    onSuccess: (updated: TreatmentPlanDto, id) => {
      queryClient.setQueryData(treatmentManageQueryKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.detail(id) });
    },
  });
}

export function useCancelTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TreatmentReasonRequest }) =>
      callOwnerTreatments((api) => api.cancel(id, body)),
    onSuccess: (updated: TreatmentPlanDto, { id }) => {
      queryClient.setQueryData(treatmentManageQueryKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.detail(id) });
    },
  });
}

export function useCompleteTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callOwnerTreatments((api) => api.complete(id)),
    onSuccess: (updated: TreatmentPlanDto, id) => {
      queryClient.setQueryData(treatmentManageQueryKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.detail(id) });
    },
  });
}

export function useUpdateSessionNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      sessionId,
      body,
    }: {
      id: string;
      sessionId: string;
      body: UpdateTreatmentSessionRequest;
    }) => callOwnerTreatments((api) => api.updateSession(id, sessionId, body)),
    onSuccess: (_: TreatmentSessionDto, { id }) => {
      queryClient.invalidateQueries({ queryKey: treatmentManageQueryKeys.detail(id) });
    },
  });
}
