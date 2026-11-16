import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import type { RatingSummary } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import { formatRatingAverage } from '../utils/reviewHelpers';

interface Props {
  summary: RatingSummary;
}

export function RatingSummaryCard({ summary }: Props) {
  const { averageRating, reviewCount, ratingCounts } = summary;
  const avgText = formatRatingAverage(averageRating) ?? '0.0';

  return (
    <View style={styles.card}>
      {/* Left Column: Big score and star visual */}
      <View style={styles.scoreCol}>
        <AppText style={styles.scoreText}>{avgText}</AppText>
        <View style={styles.starsRow} accessibilityRole="text" accessibilityLabel={`Điểm trung bình ${avgText} trên 5 sao`}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= Math.round(averageRating ?? 0);
            return (
              <Star
                key={star}
                size={16}
                color={isFilled ? '#F59E0B' : colors.border}
                fill={isFilled ? '#F59E0B' : 'transparent'}
              />
            );
          })}
        </View>
        <AppText style={styles.countText}>
          {reviewCount > 0 ? `${reviewCount} đánh giá` : 'Chưa có đánh giá'}
        </AppText>
      </View>

      <View style={styles.divider} />

      {/* Right Column: 5 Breakdown Bars (5★ -> 1★) */}
      <View style={styles.breakdownCol}>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = ratingCounts[String(stars)] ?? 0;
          const percent = reviewCount > 0 ? (count / reviewCount) * 100 : 0;

          return (
            <View key={stars} style={styles.barRow}>
              <View style={styles.starLabelWrap}>
                <AppText style={styles.starLabel}>{stars}</AppText>
                <Star size={10} color="#F59E0B" fill="#F59E0B" />
              </View>

              <View style={styles.track}>
                <View style={[styles.progress, { width: `${percent}%` }]} />
              </View>

              <AppText style={styles.barCount}>{count}</AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  scoreCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    minWidth: 100,
  },
  scoreText: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 40,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  countText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border,
    marginRight: 16,
  },
  breakdownCol: {
    flex: 1,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 24,
    justifyContent: 'flex-end',
  },
  starLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  barCount: {
    fontSize: 11,
    color: colors.muted,
    width: 24,
    textAlign: 'right',
  },
});
