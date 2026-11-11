import type { SkinType } from '@spa/shared-types';
import { skinTypeLabels } from '@/features/treatments/treatmentStatus';

/** Skin types in display order for the "Loại da" select. */
export const skinTypeOptions: readonly { value: SkinType; label: string }[] = (
  ['normal', 'dry', 'oily', 'combination', 'sensitive'] as const
).map((value) => ({ value, label: skinTypeLabels[value] }));

export const skinTypeLabel = (value: SkinType) => skinTypeLabels[value];
