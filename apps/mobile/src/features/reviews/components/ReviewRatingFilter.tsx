import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import type { RatingSummary } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';

interface Props {
  selectedRating: number | undefined;
  onSelectRating: (rating: number | undefined) => void;
  summary: RatingSummary;
}

export function ReviewRatingFilter({
  selectedRating,
  onSelectRating,
  summary,
}: Props) {
  const { reviewCount, ratingCounts } = summary;

  const filters: { value: number | undefined; label: string; count: number }[] = [
    { value: undefined, label: 'Tất cả', count: reviewCount },
    { value: 5, label: '5', count: ratingCounts['5'] ?? 0 },
    { value: 4, label: '4', count: ratingCounts['4'] ?? 0 },
    { value: 3, label: '3', count: ratingCounts['3'] ?? 0 },
    { value: 2, label: '2', count: ratingCounts['2'] ?? 0 },
    { value: 1, label: '1', count: ratingCounts['1'] ?? 0 },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {filters.map((f) => {
        const isSelected = selectedRating === f.value;

        return (
          <Pressable
            key={f.label}
            onPress={() => onSelectRating(f.value)}
            style={[styles.chip, isSelected && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Lọc đánh giá ${f.label} sao (${f.count})`}
          >
            <AppText style={[styles.chipText, isSelected && styles.chipTextActive]}>
              {f.label}
            </AppText>
            {f.value !== undefined ? (
              <Star
                size={12}
                color={isSelected ? '#F59E0B' : colors.muted}
                fill={isSelected ? '#F59E0B' : 'transparent'}
              />
            ) : null}
            <AppText style={[styles.countBadge, isSelected && styles.countBadgeActive]}>
              ({f.count})
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  countBadge: {
    fontSize: 11,
    color: colors.muted,
  },
  countBadgeActive: {
    color: colors.primaryPressed,
    fontWeight: '600',
  },
});
