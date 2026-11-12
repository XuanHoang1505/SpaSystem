import { useMutation, useQueryClient } from '@tanstack/react-query';
import { careQueryKeys } from '@spa/api-client';
import type { SaveAllergyRequest, SaveSkinProfileRequest, SkinProfile } from '@spa/shared-types';
import { callCare, callCareVoid } from '@/lib/api/care';

export interface SaveSkinProfileVariables {
  appointmentId: string;
  /** Null when creating; the profile id when updating (`PUT /skin-profiles/{id}`). */
  skinProfileId: string | null;
  body: SaveSkinProfileRequest;
}

/** Writing a skin profile flips `hasSkinProfile`/`skinProfileId`: keep the returned profile, reload the visit and list. */
function useSaveSkinProfile(run: (variables: SaveSkinProfileVariables) => Promise<SkinProfile>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (profile, { appointmentId }) =>
      queryClient.setQueryData(careQueryKeys.skinProfile(appointmentId), profile),
    onSettled: (_data, _error, { appointmentId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: careQueryKeys.appointment(appointmentId) }),
        queryClient.invalidateQueries({ queryKey: careQueryKeys.assignedAll }),
      ]),
  });
}

export function useCreateSkinProfile() {
  return useSaveSkinProfile(({ appointmentId, body }) =>
    callCare((api) => api.createSkinProfile(appointmentId, body)),
  );
}

export function useUpdateSkinProfile() {
  return useSaveSkinProfile(({ skinProfileId, body }) =>
    callCare((api) => api.updateSkinProfile(skinProfileId ?? '', body)),
  );
}

interface AllergyTarget {
  customerId: string;
  appointmentId: string;
}

/** Allergies show on the visit (highlight) and the list (`hasAllergies`): reload all three. */
function useAllergyMutation<TVariables extends AllergyTarget, TResult>(
  run: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: (_data, _error, { customerId, appointmentId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: careQueryKeys.allergies(customerId) }),
        queryClient.invalidateQueries({ queryKey: careQueryKeys.appointment(appointmentId) }),
        queryClient.invalidateQueries({ queryKey: careQueryKeys.assignedAll }),
      ]),
  });
}

export function useCreateAllergy() {
  return useAllergyMutation(({ customerId, body }: AllergyTarget & { body: SaveAllergyRequest }) =>
    callCare((api) => api.createAllergy(customerId, body)),
  );
}

export function useUpdateAllergy() {
  return useAllergyMutation(
    ({
      customerId,
      allergyId,
      body,
    }: AllergyTarget & { allergyId: string; body: SaveAllergyRequest }) =>
      callCare((api) => api.updateAllergy(customerId, allergyId, body)),
  );
}

export function useDeleteAllergy() {
  return useAllergyMutation(({ customerId, allergyId }: AllergyTarget & { allergyId: string }) =>
    callCareVoid((api) => api.deleteAllergy(customerId, allergyId)),
  );
}

/** UC-SPA-28: write the returned appointment so the status and buttons change at once, then reload the list. */
export function useCompleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, result }: { id: string; result: string | null }) =>
      callCare((api) => api.complete(id, result)),
    onSuccess: ({ appointment }, { id }) =>
      queryClient.setQueryData(careQueryKeys.appointment(id), appointment),
    // A refusal (status changed, reassigned, entitlement state) means the visit on screen is stale.
    onError: (_error, { id }) =>
      queryClient.invalidateQueries({ queryKey: careQueryKeys.appointment(id) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: careQueryKeys.assignedAll }),
  });
}
