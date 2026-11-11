import type {
  ApiResponse,
  ChangePromotionStatusRequest,
  PagedResponse,
  PromotionDto,
  PromotionSearchParams,
  SavePromotionRequest,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/promotions';

export class PromotionsApi {
  constructor(private readonly client: ApiClient) {}

  search(
    params?: PromotionSearchParams,
    signal?: AbortSignal,
  ): Promise<ApiResponse<PagedResponse<PromotionDto>>> {
    return this.client.get<ApiResponse<PagedResponse<PromotionDto>>>(base, {
      query: { ...params },
      signal,
    });
  }

  get(id: string, signal?: AbortSignal): Promise<ApiResponse<PromotionDto>> {
    return this.client.get<ApiResponse<PromotionDto>>(`${base}/${encodeURIComponent(id)}`, {
      signal,
    });
  }

  create(
    body: SavePromotionRequest,
    signal?: AbortSignal,
  ): Promise<ApiResponse<PromotionDto>> {
    return this.client.post<SavePromotionRequest, ApiResponse<PromotionDto>>(base, body, {
      signal,
    });
  }

  update(
    id: string,
    body: SavePromotionRequest,
    signal?: AbortSignal,
  ): Promise<ApiResponse<PromotionDto>> {
    return this.client.put<SavePromotionRequest, ApiResponse<PromotionDto>>(
      `${base}/${encodeURIComponent(id)}`,
      body,
      { signal },
    );
  }

  changeStatus(
    id: string,
    body: ChangePromotionStatusRequest,
    signal?: AbortSignal,
  ): Promise<void> {
    return this.client.patch<ChangePromotionStatusRequest, void>(
      `${base}/${encodeURIComponent(id)}/status`,
      body,
      { signal },
    );
  }
}

export const promotionErrorCodes = {
  promotionNotFound: 'promotion_not_found',
  promotionCodeExists: 'promotion_code_exists',
  promotionInUse: 'promotion_in_use',
  usageLimitBelowUsed: 'promotion_usage_limit_below_used',
  promotionInvalid: 'promotion_invalid',
  promotionNotApplicable: 'promotion_not_applicable',
} as const;

export const promotionQueryKeys = {
  all: ['promotions'] as const,
  lists: () => ['promotions', 'list'] as const,
  list: (params?: PromotionSearchParams) => ['promotions', 'list', params] as const,
  details: () => ['promotions', 'detail'] as const,
  detail: (id: string) => ['promotions', 'detail', id] as const,
};
