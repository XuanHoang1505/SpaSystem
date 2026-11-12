import type {
  ApiResponse,
  AvatarUrlDto,
  ChangePasswordRequest,
  ChangeUserStatusRequest,
  MeDto,
  PagedResponse,
  UpdateProfileRequest,
  UserDetail,
  UserFilterParams,
  UserListItem,
} from '@spa/shared-types';
import type { ApiClient, RequestOptions } from './index';

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  getMe(options?: RequestOptions): Promise<ApiResponse<MeDto>> {
    return this.client.get<ApiResponse<MeDto>>('/api/v1/me', options);
  }

  updateMe(body: UpdateProfileRequest, options?: RequestOptions): Promise<ApiResponse<MeDto>> {
    return this.client.put<UpdateProfileRequest, ApiResponse<MeDto>>('/api/v1/me', body, options);
  }

  changePassword(body: ChangePasswordRequest, options?: RequestOptions): Promise<void> {
    return this.client.put<ChangePasswordRequest, void>('/api/v1/me/password', body, options);
  }

  uploadAvatar(file: File | Blob, options?: RequestOptions): Promise<ApiResponse<AvatarUrlDto>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.client.post<FormData, ApiResponse<AvatarUrlDto>>(
      '/api/v1/me/avatar',
      formData,
      options,
    );
  }

  deleteAvatar(options?: RequestOptions): Promise<void> {
    return this.client.delete<void>('/api/v1/me/avatar', options);
  }
}

export const usersQueryKeys = {
  all: ['users'] as const,
  me: () => ['users', 'me'] as const,
};

export const usersErrorCodes = {
  validationError: 'validation_error',
  duplicatePhoneNumber: 'duplicate_phone_number',
  invalidCurrentPassword: 'invalid_current_password',
  passwordTooWeak: 'password_too_weak',
  invalidFileType: 'invalid_file_type',
  fileTooLarge: 'file_too_large',
  uploadFailed: 'upload_failed',
  rateLimited: 'rate_limited',
  phoneExists: 'phone_exists',
  userNotFound: 'user_not_found',
  cannotLockSelf: 'cannot_lock_self',
  accountInactive: 'account_inactive',
} as const;

const ownerPath = (id: string, child?: string) =>
  `/api/v1/users/${encodeURIComponent(id)}${child ? `/${child}` : ''}`;

/** UC-SPA-05: the owner searches, reads, edits and locks/unlocks accounts. */
export class OwnerUsersApi {
  constructor(private readonly client: ApiClient) {}

  list(params: UserFilterParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<UserListItem>>>('/api/v1/users', {
      query: { ...params },
      signal,
    });
  }

  get(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<UserDetail>>(ownerPath(id), { signal });
  }

  update(id: string, body: UpdateProfileRequest) {
    return this.client.put<UpdateProfileRequest, ApiResponse<UserDetail>>(ownerPath(id), body);
  }

  /** 204 No Content; locking ends every session of the account. */
  changeStatus(id: string, status: ChangeUserStatusRequest['status']) {
    return this.client.patch<ChangeUserStatusRequest, void>(ownerPath(id, 'status'), { status });
  }
}

export const ownerUsersQueryKeys = {
  all: ['owner-users'] as const,
  list: (params: UserFilterParams) => ['owner-users', 'list', params] as const,
  detail: (id: string) => ['owner-users', 'detail', id] as const,
};
