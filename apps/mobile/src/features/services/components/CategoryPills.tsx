import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import { colors, spacing } from '@theme/index';
import { useServiceCategories } from '../hooks/useServiceCategories';

export function CategoryPills({
  selectedCategoryId,
  onSelectCategory,
}: {
  selectedCategoryId?: string;
  onSelectCategory: (categoryId?: string) => void;
}) {
  const { data: categories } = useServiceCategories();

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tất cả loại dịch vụ"
          accessibilityState={{ selected: !selectedCategoryId }}
          onPress={() => onSelectCategory(undefined)}
          style={[styles.pill, !selectedCategoryId && styles.pillActive]}
        >
          <AppText style={[styles.pillText, !selectedCategoryId && styles.pillTextActive]}>
            Tất cả
          </AppText>
        </Pressable>

        {categories?.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              accessibilityRole="button"
              accessibilityLabel={`Loại dịch vụ ${cat.name}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectCategory(isSelected ? undefined : cat.id)}
              style={[styles.pill, isSelected && styles.pillActive]}
            >
              <AppText style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {cat.name}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.xs,
  },
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  pill: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  pillTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
