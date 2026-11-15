import { StyleSheet, View } from 'react-native';
import type { CustomerAllergy } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import { AlertTriangle, AlertCircle } from 'lucide-react-native';
import { allergySeverityLabels } from '../utils/careHelpers';

interface Props {
  allergies: readonly CustomerAllergy[];
}

export function AllergyHighlightCard({ allergies }: Props) {
  if (!allergies || allergies.length === 0) return null;

  const hasSevere = allergies.some((a) => a.severity === 'severe');
  const toneBg = hasSevere ? colors.errorSoft : colors.warningSoft;
  const toneBorder = hasSevere ? colors.errorBorder : colors.warningBorder;
  const toneText = hasSevere ? colors.error : colors.warning;
  const Icon = hasSevere ? AlertTriangle : AlertCircle;

  return (
    <View
      style={[styles.container, { backgroundColor: toneBg, borderColor: toneBorder }]}
      accessibilityRole="alert"
      accessibilityLabel={`Cảnh báo: Khách có ${allergies.length} dị ứng cần lưu ý`}
    >
      <View style={styles.header}>
        <Icon size={18} color={toneText} />
        <AppText style={[styles.title, { color: toneText }]}>
          Khách có {allergies.length} dị ứng cần lưu ý{hasSevere ? ' (CÓ DỊ ỨNG NẶNG)' : ''}:
        </AppText>
      </View>

      <View style={styles.list}>
        {allergies.map((allergy) => (
          <View key={allergy.id} style={styles.allergyItem}>
            <AppText style={styles.allergenText}>• {allergy.allergen}</AppText>
            <View
              style={[
                styles.severityBadge,
                allergy.severity === 'severe' && styles.severeBadge,
              ]}
            >
              <AppText
                style={[
                  styles.severityText,
                  allergy.severity === 'severe' && styles.severeText,
                ]}
              >
                {allergySeverityLabels[allergy.severity] ?? allergy.severity}
              </AppText>
            </View>
            {allergy.note ? (
              <AppText style={styles.noteText}>({allergy.note})</AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  list: {
    paddingLeft: 4,
    gap: 6,
  },
  allergyItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  allergenText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  severeBadge: {
    backgroundColor: colors.errorBorder,
    borderColor: colors.error,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  severeText: {
    color: colors.error,
  },
  noteText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
});
