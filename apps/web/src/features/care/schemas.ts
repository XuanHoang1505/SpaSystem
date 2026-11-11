import { z } from 'zod';
import type { SaveSkinProfileRequest } from '@spa/shared-types';

/** `Booking:MaxQueryRangeDays` of the backend (BR-STF-10). */
export const ASSIGNED_MAX_RANGE_DAYS = 42;
export const SKIN_PROFILE_TEXT_MAX = 2000;
export const ALLERGEN_MAX = 255;
export const ALLERGY_NOTE_MAX = 1000;
export const CARE_RESULT_MAX = 2000;

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;

/** SCR-W26 date range: checked before calling, so a bad range never reaches the API. */
export const assignedFilterSchema = z
  .object({
    from: z.string().min(1, 'Chọn ngày bắt đầu.'),
    to: z.string().min(1, 'Chọn ngày kết thúc.'),
  })
  .superRefine(({ from, to }, context) => {
    if (!from || !to) return;
    const days = dayNumber(to) - dayNumber(from);
    if (Number.isNaN(days)) return;
    if (days < 0) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Đến ngày phải từ Từ ngày trở đi.',
      });
    } else if (days + 1 > ASSIGNED_MAX_RANGE_DAYS) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: `Khoảng ngày tối đa ${ASSIGNED_MAX_RANGE_DAYS} ngày.`,
      });
    }
  });

const profileText = z.string().max(SKIN_PROFILE_TEXT_MAX, `Tối đa ${SKIN_PROFILE_TEXT_MAX} ký tự.`);

/** BR-CARE-05: skin type required, every text optional and at most 2000 characters. */
export const skinProfileSchema = z.object({
  skinType: z.enum(['normal', 'dry', 'oily', 'combination', 'sensitive'], {
    error: 'Chọn loại da.',
  }),
  mainConcerns: profileText,
  currentProducts: profileText,
  careGoals: profileText,
  recommendedTreatment: profileText,
  note: profileText,
});

export type SkinProfileValues = z.input<typeof skinProfileSchema>;
export type SkinProfileOutput = z.output<typeof skinProfileSchema>;

const textOrNull = (value: string) => value.trim() || null;

/** Every field is replaced on the server, so blanks travel as `null`. */
export function toSkinProfileRequest(values: SkinProfileOutput): SaveSkinProfileRequest {
  return {
    skinType: values.skinType,
    mainConcerns: textOrNull(values.mainConcerns),
    currentProducts: textOrNull(values.currentProducts),
    careGoals: textOrNull(values.careGoals),
    recommendedTreatment: textOrNull(values.recommendedTreatment),
    note: textOrNull(values.note),
  };
}

/** BR-CARE-05: allergen 1-255, severity required, note at most 1000. */
export const allergySchema = z.object({
  allergen: z
    .string()
    .trim()
    .min(1, 'Nhập tác nhân gây dị ứng.')
    .max(ALLERGEN_MAX, `Tác nhân tối đa ${ALLERGEN_MAX} ký tự.`),
  severity: z.enum(['mild', 'moderate', 'severe'], { error: 'Chọn mức độ.' }),
  note: z.string().trim().max(ALLERGY_NOTE_MAX, `Ghi chú tối đa ${ALLERGY_NOTE_MAX} ký tự.`),
});

export type AllergyValues = z.input<typeof allergySchema>;
export type AllergyOutput = z.output<typeof allergySchema>;

/** UC-SPA-28: the care result is optional, at most 2000 characters. */
export const completeSchema = z.object({
  result: z.string().trim().max(CARE_RESULT_MAX, `Kết quả tối đa ${CARE_RESULT_MAX} ký tự.`),
});

export type CompleteValues = z.input<typeof completeSchema>;
