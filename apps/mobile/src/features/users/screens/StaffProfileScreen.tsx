import { router } from 'expo-router';
import { BadgeCheck, CalendarCheck, CalendarDays } from 'lucide-react-native';
import { SignedInProfile } from './SignedInProfile';

export function StaffProfileScreen() {
  return (
    <SignedInProfile
      badge="Kỹ thuật viên"
      badgeIcon={BadgeCheck}
      fallbackName="Nhân viên"
      fallbackInitials="NV"
      sections={[
        {
          title: 'Công việc',
          items: [
            {
              title: 'Lịch làm việc của tôi',
              subtitle: 'Ca làm theo tuần và tháng',
              icon: CalendarDays,
              onPress: () => router.push('/(staff)/schedule'),
            },
            {
              title: 'Lịch hẹn được phân công',
              subtitle: 'Buổi chăm sóc được giao cho bạn',
              icon: CalendarCheck,
              onPress: () => router.push('/(staff)/bookings'),
            },
          ],
        },
      ]}
    />
  );
}
