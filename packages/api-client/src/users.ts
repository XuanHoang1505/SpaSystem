import type {
  ApiResponse,
  AvatarUrlDto,
  ChangePasswordRequest,
  MeDto,
  UpdateProfileRequest,
} from '@spa/shared-types';
import type { ApiClient, RequestOptions } from './index';

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  getMe(options?: RequestOptions): Promise<ApiResponse<MeDto>> {
    return this.client.get<ApiResponse<MeDto>>('/api/v1/me', options);
  }

  updateMe(
    body: UpdateProfileRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<MeDto>> {
    return this.client.put<UpdateProfileRequest, ApiResponse<MeDto>>(
      '/api/v1/me',
      body,
      options,
    );
  }

  changePassword(
    body: ChangePasswordRequest,
    options?: RequestOptions,
  ): Promise<void> {
    return this.client.put<ChangePasswordRequest, void>(
      '/api/v1/me/password',
      body,
      options,
    );
  }

  uploadAvatar(
    file: File | Blob,
    options?: RequestOptions,
  ): Promise<ApiResponse<AvatarUrlDto>> {
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
} as const;
