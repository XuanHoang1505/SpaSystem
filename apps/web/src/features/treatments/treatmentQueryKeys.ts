import type { TreatmentSearchParams } from '@spa/shared-types';

export const treatmentManageQueryKeys = {
  all: ['treatments', 'manage'] as const,
  lists: () => ['treatments', 'manage', 'list'] as const,
  list: (params?: TreatmentSearchParams) => ['treatments', 'manage', 'list', params] as const,
  details: () => ['treatments', 'manage', 'detail'] as const,
  detail: (id: string) => ['treatments', 'manage', 'detail', id] as const,
};
