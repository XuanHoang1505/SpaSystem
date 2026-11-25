import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StaffListItem, StaffStatusFilter } from '@spa/shared-types';
import {
  BadgeCheck,
  CalendarDays,
  CalendarRange,
  Mail,
  Phone,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppInput } from '@components/common/AppInput';
import { AppLoader } from '@components/common/AppLoader';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { EmptyState } from '@components/common/EmptyState';
import { ErrorState } from '@components/common/ErrorState';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { foldVietnamese, initialsOf } from '@/lib/formatting/initials';
import { colors, radius, spacing } from '@theme/index';
import { getTodayVnDate } from '@features/bookings/utils/bookingHelpers';
import { OwnerScheduleView } from '../components/owner/OwnerScheduleView';
import { useOwnerStaff } from '../hooks/useOwnerStaff';
import { getMondayOfDate } from '../utils/scheduleHelpers';

const views = [
  { value: 'list', label: 'Nhân viên', icon: Users },
  { value: 'schedule', label: 'Lịch làm việc', icon: CalendarRange },
] as const;

const tabs: readonly { value: StaffStatusFilter; label: string }[] = [
  { value: 'working', label: 'Đang làm việc' },
  { value: 'resigned', label: 'Đã nghỉ' },
];

type StaffTabView = 'list' | 'schedule';

/**
 * The owner's staff tab (UC-SPA-22/23): the staff list (search, contact, skills) and a read-only week of shifts.
 * Adding staff, editing skills, planning shifts and reviewing certifications stay on the web workspace.
 */
export function OwnerStaffScreen() {
  const [view, setView] = useState<StaffTabView>('list');
  const [status, setStatus] = useState<StaffStatusFilter>('working');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StaffListItem | null>(null);
  const [monday, setMonday] = useState(() => getMondayOfDate(getTodayVnDate()));
  const [scheduleStaffId, setScheduleStaffId] = useState<string | undefined>();
  const query = useOwnerStaff(status);
  // The schedule filter lists the staff who can have shifts, whatever the list tab shows.
  const working = useOwnerStaff('working');

  const items = useMemo(() => {
    const all = query.data?.items ?? [];
    const term = foldVietnamese(search.trim());
    if (!term) return all;
    return all.filter(
      (item) =>
        foldVietnamese(item.fullName).includes(term) ||
        item.phoneNumber.includes(term) ||
        foldVietnamese(item.specialty ?? '').includes(term),
    );
  }, [query.data, search]);
  const pendingTotal = (query.data?.items ?? []).reduce(
    (sum, item) => sum + item.pendingCertificationCount,
    0,
  );

  const openSchedule = (staffMemberId: string) => {
    setSelected(null);
    setScheduleStaffId(staffMemberId);
    setView('schedule');
  };

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <View style={styles.viewSwitch}>
        <View style={styles.segment}>
          {views.map((option) => {
            const active = option.value === view;
            const Icon = option.icon;
            return (
              <Pressable
                key={option.value}
                onPress={() => setView(option.value)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segmentButton, active && styles.segmentActive]}
              >
                <Icon size={16} color={active ? colors.onPrimary : colors.muted} />
                <AppText style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {view === 'schedule' ? (
        <OwnerScheduleView
          monday={monday}
          onMondayChange={setMonday}
          staff={working.data?.items ?? []}
          staffMemberId={scheduleStaffId}
          onStaffChange={setScheduleStaffId}
        />
      ) : (
        <>
          <View style={styles.top}>
            <View style={styles.statusRow}>
              {tabs.map((tab) => {
                const active = tab.value === status;
                return (
                  <Pressable
                    key={tab.value}
                    onPress={() => setStatus(tab.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.statusChip, active && styles.statusChipActive]}
                  >
                    <AppText style={[styles.statusText, active && styles.statusTextActive]}>
                      {tab.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label="Tìm nhân viên"
              hideLabel
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm theo tên, số điện thoại, chuyên môn"
              leading={<Search size={18} color={colors.muted} />}
            />
            {status === 'working' && pendingTotal > 0 ? (
              <AppNotice
                tone="info"
                message={`${pendingTotal} chứng chỉ đang chờ duyệt. Duyệt trên trang quản trị web.`}
              />
            ) : null}
          </View>

          {query.isLoading ? (
            <View style={styles.center}>
              <AppLoader />
            </View>
          ) : query.isError ? (
            <View style={styles.padded}>
              <ErrorState
                message="Không tải được danh sách nhân viên. Vui lòng thử lại."
                onRetry={() => void query.refetch()}
              />
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={query.isRefetching}
                  onRefresh={() => void query.refetch()}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              ListHeaderComponent={
                items.length > 0 ? (
                  <AppText style={styles.count}>{items.length} nhân viên</AppText>
                ) : null
              }
              ListEmptyComponent={
                <EmptyState
                  title="Không có nhân viên"
                  description={
                    search ? 'Không có nhân viên khớp từ khóa.' : 'Danh sách này đang trống.'
                  }
                />
              }
              renderItem={({ item }) => <StaffRow item={item} onPress={() => setSelected(item)} />}
            />
          )}
        </>
      )}

      <StaffDetailSheet
        staff={selected}
        onClose={() => setSelected(null)}
        onOpenSchedule={openSchedule}
      />
    </AppScreen>
  );
}

function Avatar({ item, size }: { item: StaffListItem; size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText style={[styles.avatarText, { fontSize: size * 0.36 }]}>
        {initialsOf(item.fullName)}
      </AppText>
      {item.avatarUrl && !failed ? (
        <Image
          source={{ uri: item.avatarUrl }}
          accessible={false}
          onError={() => setFailed(true)}
          style={[styles.avatarImage, { borderRadius: size / 2 }]}
        />
      ) : null}
    </View>
  );
}

function StaffRow({ item, onPress }: { item: StaffListItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.fullName}, ${item.services.length} dịch vụ`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Avatar item={item} size={52} />
      <View style={styles.cardBody}>
        <AppText style={styles.name} numberOfLines={1}>
          {item.fullName}
        </AppText>
        <AppText style={styles.muted} numberOfLines={1}>
          {item.specialty || 'Kỹ thuật viên'} · {item.services.length} dịch vụ
        </AppText>
        <AppText style={styles.muted}>{item.phoneNumber}</AppText>
      </View>
      {item.pendingCertificationCount > 0 ? (
        <View style={styles.pendingBadge}>
          <AppText style={styles.pendingText}>{item.pendingCertificationCount} chờ duyệt</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function StaffDetailSheet({
  staff,
  onClose,
  onOpenSchedule,
}: {
  staff: StaffListItem | null;
  onClose: () => void;
  onOpenSchedule: (staffMemberId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={staff !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng chi tiết" />
        {staff ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.sheetHeader}>
              <AppText style={styles.sheetTitle}>Hồ sơ nhân viên</AppText>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Đóng chi tiết"
                style={styles.close}
              >
                <X size={20} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetBody}>
              <View style={styles.profile}>
                <Avatar item={staff} size={72} />
                <View style={styles.cardBody}>
                  <AppText style={styles.profileName}>{staff.fullName}</AppText>
                  <AppText style={styles.muted}>{staff.specialty || 'Kỹ thuật viên'}</AppText>
                </View>
              </View>

              <View style={styles.rows}>
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${staff.phoneNumber}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Gọi ${staff.phoneNumber}`}
                  style={styles.row}
                >
                  <Phone size={16} color={colors.primary} />
                  <AppText style={[styles.rowText, styles.link]}>{staff.phoneNumber}</AppText>
                </Pressable>
                <Pressable
                  onPress={() => void Linking.openURL(`mailto:${staff.email}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Gửi email ${staff.email}`}
                  style={styles.row}
                >
                  <Mail size={16} color={colors.primary} />
                  <AppText style={[styles.rowText, styles.link]}>{staff.email}</AppText>
                </Pressable>
                <View style={styles.row}>
                  <CalendarDays size={16} color={colors.primary} />
                  <AppText style={styles.rowText}>
                    Vào làm {formatLocalDate(staff.hireDate)}
                    {staff.resignationDate
                      ? ` · Nghỉ từ ${formatLocalDate(staff.resignationDate)}`
                      : ''}
                  </AppText>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <BadgeCheck size={16} color={colors.primary} />
                  <AppText style={styles.sectionTitle}>
                    Dịch vụ thực hiện ({staff.services.length})
                  </AppText>
                </View>
                {staff.services.length === 0 ? (
                  <AppText style={styles.muted}>Chưa gán dịch vụ nào.</AppText>
                ) : (
                  <View style={styles.tags}>
                    {staff.services.map((service) => (
                      <View key={service.id} style={styles.tag}>
                        <AppText style={styles.tagText}>{service.name}</AppText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {staff.pendingCertificationCount > 0 ? (
                <AppNotice
                  tone="info"
                  message={`${staff.pendingCertificationCount} chứng chỉ đang chờ duyệt.`}
                />
              ) : null}
              {staff.resignationDate === null ? (
                <AppButton
                  title="Xem lịch làm việc"
                  variant="outline"
                  onPress={() => onOpenSchedule(staff.id)}
                />
              ) : null}
              <AppText style={styles.hint}>
                Thêm nhân viên, sửa kỹ năng, phân ca và duyệt chứng chỉ trên trang quản trị web.
              </AppText>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, backgroundColor: colors.background },
  viewSwitch: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  statusRow: { flexDirection: 'row', gap: spacing.xs },
  statusChip: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  statusChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  statusText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  statusTextActive: { color: colors.primary },
  top: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: colors.onPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  padded: { padding: spacing.md },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm, flexGrow: 1 },
  count: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.85 },
  cardBody: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  avatar: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700' },
  avatarImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  pendingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  pendingText: { fontSize: 11, fontWeight: '700', color: colors.accentGoldText },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: spacing.lg, gap: spacing.md },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileName: { fontSize: 18, fontWeight: '800', color: colors.text },
  rows: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  rowText: { flex: 1, fontSize: 14, color: colors.text },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  section: { gap: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.primaryPressed },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
