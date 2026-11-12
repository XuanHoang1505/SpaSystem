import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ownerUsersQueryKeys } from '@spa/api-client';
import type {
  ChangeUserStatusRequest,
  UpdateProfileRequest,
  UserFilterParams,
} from '@spa/shared-types';
import { ordersRetry } from '@/features/orders';
import { callOwnerUsers, callOwnerUsersVoid } from '@/lib/api/users';

/** SCR-W40: accounts searched and filtered on the server, newest first. */
export function useOwnerUsers(params: UserFilterParams) {
  return useQuery({
    queryKey: ownerUsersQueryKeys.list(params),
    queryFn: ({ signal }) => callOwnerUsers((api) => api.list(params, signal)),
    placeholderData: keepPreviousData,
    retry: ordersRetry,
  });
}

/** One account for the detail Sheet; `null` sends nothing. */
export function useOwnerUser(id: string | null) {
  return useQuery({
    queryKey: ownerUsersQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => callOwnerUsers((api) => api.get(id ?? '', signal)),
    enabled: id !== null,
    retry: ordersRetry,
  });
}

/** Loads one account's detail through the cache (the edit form needs date of birth and gender). */
export function useFetchOwnerUser() {
  const queryClient = useQueryClient();
  return (id: string) =>
    queryClient.fetchQuery({
      queryKey: ownerUsersQueryKeys.detail(id),
      queryFn: ({ signal }) => callOwnerUsers((api) => api.get(id, signal)),
    });
}

/** A1: keep the returned detail, reload the list (name, status). */
export function useUpdateOwnerUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProfileRequest }) =>
      callOwnerUsers((api) => api.update(id, body)),
    onSuccess: (detail, { id }) => queryClient.setQueryData(ownerUsersQueryKeys.detail(id), detail),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ownerUsersQueryKeys.all }),
  });
}

/** A2: lock or unlock (204), then reload the list and the detail either way. */
export function useChangeUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ChangeUserStatusRequest['status'] }) =>
      callOwnerUsersVoid((api) => api.changeStatus(id, status)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ownerUsersQueryKeys.all }),
  });
}
