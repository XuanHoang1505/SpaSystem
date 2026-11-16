import { router, type Href } from 'expo-router';
import { BadgeCheck, Bell, CalendarCheck, CalendarDays, History } from 'lucide-react-native';
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
              subtitle: 'Ca làm theo tuần và dòng thời gian',
              icon: CalendarDays,
              onPress: () => router.push('/(staff)/schedule'),
            },
            {
              title: 'Lịch hẹn được phân công',
              subtitle: 'Buổi chăm sóc được giao cho bạn',
              icon: CalendarCheck,
              onPress: () => router.push('/(staff)/bookings'),
            },
            {
              title: 'Lịch sử khách đã chăm sóc',
              subtitle: 'Xem lại các buổi chăm sóc và hồ sơ da',
              icon: History,
              onPress: () => router.push('/(staff)/care-history'),
            },
            {
              title: 'Thông báo',
              subtitle: 'Lịch hẹn, ca làm và tin nhắn hệ thống',
              icon: Bell,
              onPress: () => router.push('/notifications' as Href),
            },
          ],
        },
      ]}
    />
  );
}
