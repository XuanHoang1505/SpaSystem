import { useMutation } from '@tanstack/react-query';
import type { ChangePasswordRequest } from '@spa/shared-types';
import { callUsersVoid } from '@/lib/api/users';

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => callUsersVoid((api) => api.changePassword(body)),
  });
}
