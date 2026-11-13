import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppButton } from '@components/common/AppButton';
import { AppInput } from '@components/common/AppInput';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing, typography } from '@theme/index';

export function PriceFilterSheet({
  visible,
  onClose,
  initialMinPrice,
  initialMaxPrice,
  onApply,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  initialMinPrice?: number;
  initialMaxPrice?: number;
  onApply: (minPrice?: number, maxPrice?: number) => void;
  onReset: () => void;
}) {
  const [min, setMin] = useState(initialMinPrice?.toString() ?? '');
  const [max, setMax] = useState(initialMaxPrice?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    const minVal = min.trim() ? Number(min.trim()) : undefined;
    const maxVal = max.trim() ? Number(max.trim()) : undefined;

    if (minVal !== undefined && isNaN(minVal)) {
      setError('Giá tối thiểu không hợp lệ');
      return;
    }
    if (maxVal !== undefined && isNaN(maxVal)) {
      setError('Giá tối đa không hợp lệ');
      return;
    }
    if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
      setError('Giá tối thiểu không được lớn hơn giá tối đa');
      return;
    }

    setError(null);
    onApply(minVal, maxVal);
    onClose();
  };

  const handleReset = () => {
    setMin('');
    setMax('');
    setError(null);
    onReset();
    onClose();
  };

  const applyPreset = (presetMin?: number, presetMax?: number) => {
    setMin(presetMin?.toString() ?? '');
    setMax(presetMax?.toString() ?? '');
    setError(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Đóng bộ lọc"
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText style={styles.title}>Lọc khoảng giá</AppText>
          </View>

          <AppText style={styles.sectionTitle}>Mức giá phổ biến</AppText>
          <View style={styles.presets}>
            <Pressable
              onPress={() => applyPreset(undefined, 300000)}
              style={styles.presetButton}
              accessibilityRole="button"
              accessibilityLabel="Dưới 300.000 đồng"
            >
              <AppText style={styles.presetText}>Dưới 300k</AppText>
            </Pressable>
            <Pressable
              onPress={() => applyPreset(300000, 700000)}
              style={styles.presetButton}
              accessibilityRole="button"
              accessibilityLabel="Từ 300.000 đến 700.000 đồng"
            >
              <AppText style={styles.presetText}>300k - 700k</AppText>
            </Pressable>
            <Pressable
              onPress={() => applyPreset(700000, undefined)}
              style={styles.presetButton}
              accessibilityRole="button"
              accessibilityLabel="Trên 700.000 đồng"
            >
              <AppText style={styles.presetText}>Trên 700k</AppText>
            </Pressable>
          </View>

          <AppText style={styles.sectionTitle}>Khoảng giá tùy chọn (VND)</AppText>
          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <AppInput
                label="Giá từ"
                placeholder="0"
                keyboardType="numeric"
                value={min}
                onChangeText={(text) => {
                  setMin(text);
                  setError(null);
                }}
              />
            </View>
            <View style={styles.inputCol}>
              <AppInput
                label="Giá đến"
                placeholder="Tối đa"
                keyboardType="numeric"
                value={max}
                onChangeText={(text) => {
                  setMax(text);
                  setError(null);
                }}
              />
            </View>
          </View>

          {error && <AppText style={styles.errorText}>{error}</AppText>}

          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <AppButton title="Đặt lại" variant="outline" onPress={handleReset} />
            </View>
            <View style={styles.actionButton}>
              <AppButton title="Áp dụng" onPress={handleApply} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  presets: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  presetText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputCol: {
    flex: 1,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.small,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
