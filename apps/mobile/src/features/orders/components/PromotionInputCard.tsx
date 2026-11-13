import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { AppliedPromotion, PromotionError } from '@spa/shared-types';
import { CheckCircle2, Tag, X } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { formatCurrency } from '@/lib/formatting/formatters';
import { promotionCodeSchema } from '../schemas';
import { colors, radius, spacing } from '@theme/index';

interface PromotionInputCardProps {
  appliedPromotion: AppliedPromotion | null;
  promotionError: PromotionError | null;
  onApply: (code: string) => void;
  onRemove: () => void;
  isLoading?: boolean;
}

export function PromotionInputCard({
  appliedPromotion,
  promotionError,
  onApply,
  onRemove,
  isLoading = false,
}: PromotionInputCardProps) {
  const [inputCode, setInputCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleApply = () => {
    const parseResult = promotionCodeSchema.safeParse(inputCode);
    if (!parseResult.success) {
      setLocalError(parseResult.error.issues[0]?.message ?? 'Mã không hợp lệ');
      return;
    }
    setLocalError(null);
    onApply(parseResult.data);
  };

  const handleRemove = () => {
    setInputCode('');
    setLocalError(null);
    onRemove();
  };

  const activeError = localError ?? promotionError?.message;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Tag size={18} color={colors.primary} />
        <AppText style={styles.title}>Mã khuyến mãi / Giảm giá</AppText>
      </View>

      {appliedPromotion ? (
        <View style={styles.appliedContainer}>
          <View style={styles.appliedInfo}>
            <CheckCircle2 size={18} color="#2e7d32" />
            <View style={styles.appliedTextCol}>
              <AppText style={styles.appliedCode}>
                Mã {appliedPromotion.code}
              </AppText>
              <AppText style={styles.appliedDiscount}>
                Đã giảm {formatCurrency(appliedPromotion.discountAmount)}
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={handleRemove}
            accessibilityRole="button"
            accessibilityLabel={`Bỏ mã khuyến mãi ${appliedPromotion.code}`}
            hitSlop={8}
            style={({ pressed }) => [
              styles.removeButton,
              pressed && styles.removeButtonPressed,
            ]}
          >
            <X size={16} color="#666" />
            <AppText style={styles.removeText}>Bỏ mã</AppText>
          </Pressable>
        </View>
      ) : (
        <View>
          <View style={styles.inputRow}>
            <TextInput
              value={inputCode}
              onChangeText={(text) => {
                setInputCode(text.toUpperCase().trim());
                if (localError) setLocalError(null);
              }}
              placeholder="Nhập mã ưu đãi..."
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Ô nhập mã khuyến mãi"
              style={[styles.input, !!activeError && styles.inputError]}
            />
            <View style={styles.applyButtonWrapper}>
              <AppButton
                variant="primary"
                title="Áp dụng"
                onPress={handleApply}
                loading={isLoading}
                disabled={!inputCode || isLoading}
                accessibilityLabel="Áp dụng mã khuyến mãi"
              />
            </View>
          </View>

          {activeError && (
            <AppText style={styles.errorText}>{activeError}</AppText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  appliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: radius.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  appliedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  appliedTextCol: {
    flex: 1,
  },
  appliedCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  appliedDiscount: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 4,
  },
  removeButtonPressed: {
    opacity: 0.7,
  },
  removeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#fafafa',
    textTransform: 'uppercase',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  applyButtonWrapper: {
    minWidth: 90,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: spacing.xs,
    marginLeft: 2,
  },
});
