import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import type { AppointmentDetail, CustomerAllergy } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import { Phone, User, Calendar, Edit2, Trash2, Plus, AlertTriangle, FileText } from 'lucide-react-native';
import { allergySeverityLabels, formatDateTimeUtc } from '../utils/careHelpers';
import { AllergyModal } from './AllergyModal';
import { useCreateAllergy, useUpdateAllergy, useDeleteAllergy } from '../hooks/useCareMutations';

interface Props {
  appointment: AppointmentDetail;
  allergies: readonly CustomerAllergy[];
}

export function CustomerCareTab({ appointment, allergies }: Props) {
  const { customer, service, treatmentSession, note, id: appointmentId } = appointment;
  const customerId = customer.id;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState<CustomerAllergy | null>(null);

  const createAllergyMutation = useCreateAllergy();
  const updateAllergyMutation = useUpdateAllergy();
  const deleteAllergyMutation = useDeleteAllergy();

  const handleCall = () => {
    if (customer.phoneNumber) {
      Linking.openURL(`tel:${customer.phoneNumber}`).catch(() => {});
    }
  };

  const handleOpenAdd = () => {
    setEditingAllergy(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (allergy: CustomerAllergy) => {
    setEditingAllergy(allergy);
    setModalVisible(true);
  };

  const handleDelete = (allergy: CustomerAllergy) => {
    Alert.alert(
      'Xóa dị ứng?',
      `Bạn có chắc chắn muốn xóa tác nhân "${allergy.allergen}"? Chỉ xóa khi ghi nhận nhầm.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            deleteAllergyMutation.mutate({ customerId, appointmentId, allergyId: allergy.id });
          },
        },
      ],
    );
  };

  const handleSaveAllergy = async (data: {
    allergen: string;
    severity: CustomerAllergy['severity'];
    note: string | null;
  }) => {
    if (editingAllergy) {
      await updateAllergyMutation.mutateAsync({
        customerId,
        appointmentId,
        allergyId: editingAllergy.id,
        body: data,
      });
    } else {
      await createAllergyMutation.mutateAsync({
        customerId,
        appointmentId,
        body: data,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Customer Info Card */}
      <View style={styles.infoCard}>
        <AppText style={styles.sectionTitle}>Thông tin khách hàng</AppText>

        <View style={styles.infoRow}>
          <User size={16} color={colors.primary} />
          <View style={styles.infoTextGroup}>
            <AppText style={styles.infoLabel}>Khách hàng</AppText>
            <AppText style={styles.infoValue}>{customer.fullName}</AppText>
          </View>
        </View>

        {customer.phoneNumber ? (
          <Pressable
            onPress={handleCall}
            style={styles.infoRow}
            accessibilityRole="button"
            accessibilityLabel={`Gọi điện cho khách hàng ${customer.fullName}`}
          >
            <Phone size={16} color={colors.primary} />
            <View style={styles.infoTextGroup}>
              <AppText style={styles.infoLabel}>Số điện thoại</AppText>
              <AppText style={[styles.infoValue, styles.phoneLink]}>
                {customer.phoneNumber} (Chạm để gọi)
              </AppText>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.infoRow}>
          <Calendar size={16} color={colors.primary} />
          <View style={styles.infoTextGroup}>
            <AppText style={styles.infoLabel}>Dịch vụ chăm sóc</AppText>
            <AppText style={styles.infoValue}>{service.name}</AppText>
            {treatmentSession ? (
              <AppText style={styles.sessionSubText}>
                Buổi {treatmentSession.sequenceNumber}/{treatmentSession.totalSessions} · {treatmentSession.packageName}
              </AppText>
            ) : null}
          </View>
        </View>

        {note ? (
          <View style={styles.infoRow}>
            <FileText size={16} color={colors.primary} />
            <View style={styles.infoTextGroup}>
              <AppText style={styles.infoLabel}>Ghi chú từ lịch hẹn</AppText>
              <AppText style={styles.noteValue}>{note}</AppText>
            </View>
          </View>
        ) : null}
      </View>

      {/* Allergies Section */}
      <View style={styles.allergiesCard}>
        <View style={styles.allergiesHeader}>
          <View>
            <AppText style={styles.sectionTitle}>Dị ứng của khách</AppText>
            <AppText style={styles.sectionSub}>Ghi nhận các tác nhân kích ứng da</AppText>
          </View>
          <Pressable
            onPress={handleOpenAdd}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel="Thêm dị ứng cho khách"
          >
            <Plus size={15} color={colors.primary} />
            <AppText style={styles.addBtnText}>Thêm</AppText>
          </Pressable>
        </View>

        {allergies.length === 0 ? (
          <View style={styles.emptyAllergies}>
            <AppText style={styles.emptyAllergiesText}>Chưa ghi nhận dị ứng nào cho khách này.</AppText>
          </View>
        ) : (
          <View style={styles.allergiesList}>
            {allergies.map((allergy) => (
              <View key={allergy.id} style={styles.allergyCard}>
                <View style={styles.allergyCardHeader}>
                  <View style={styles.allergenTitleGroup}>
                    <AlertTriangle
                      size={16}
                      color={allergy.severity === 'severe' ? colors.error : colors.warning}
                    />
                    <AppText style={styles.allergenName}>{allergy.allergen}</AppText>
                    <View
                      style={[
                        styles.severityTag,
                        allergy.severity === 'severe' && styles.severeTag,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.severityTagText,
                          allergy.severity === 'severe' && styles.severeTagText,
                        ]}
                      >
                        {allergySeverityLabels[allergy.severity]}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.actionBtns}>
                    <Pressable
                      onPress={() => handleOpenEdit(allergy)}
                      style={styles.iconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Sửa dị ứng ${allergy.allergen}`}
                    >
                      <Edit2 size={16} color={colors.muted} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(allergy)}
                      style={styles.iconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa dị ứng ${allergy.allergen}`}
                    >
                      <Trash2 size={16} color={colors.accentRose} />
                    </Pressable>
                  </View>
                </View>

                {allergy.note ? <AppText style={styles.allergyNote}>{allergy.note}</AppText> : null}

                <AppText style={styles.recordedTime}>
                  Ghi nhận lúc: {formatDateTimeUtc(allergy.recordedAtUtc)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>

      <AllergyModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        allergyToEdit={editingAllergy}
        onSave={handleSaveAllergy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.muted,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    minHeight: 44,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  phoneLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  sessionSubText: {
    fontSize: 13,
    color: colors.primaryPressed,
    fontWeight: '600',
    marginTop: 2,
  },
  noteValue: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
  },
  allergiesCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allergiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    minHeight: 36,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyAllergies: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyAllergiesText: {
    fontSize: 14,
    color: colors.muted,
    fontStyle: 'italic',
  },
  allergiesList: {
    gap: 12,
  },
  allergyCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allergyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  allergenTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  allergenName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  severityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderWidth: 1,
  },
  severeTag: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.errorBorder,
  },
  severityTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  severeTagText: {
    color: colors.error,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    minHeight: 40,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allergyNote: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  recordedTime: {
    fontSize: 11,
    color: colors.muted,
  },
});
