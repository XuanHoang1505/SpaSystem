import { router } from 'expo-router';
import { BarChart3, CalendarCheck, Crown, Layers, Users } from 'lucide-react-native';
import { SignedInProfile } from './SignedInProfile';

export function OwnerProfileScreen() {
  return (
    <SignedInProfile
      badge="Chủ quản lý Spa"
      badgeIcon={Crown}
      fallbackName="Chủ quản lý"
      fallbackInitials="QL"
      sections={[
        {
          title: 'Quản lý spa',
          items: [
            {
              title: 'Báo cáo doanh thu & KPI',
              subtitle: 'Doanh thu theo tháng, quý và năm',
              icon: BarChart3,
              onPress: () => router.push('/(owner)/reports'),
            },
            {
              title: 'Quản lý lịch hẹn toàn spa',
              subtitle: 'Xác nhận, dời giờ và phân công',
              icon: CalendarCheck,
              onPress: () => router.push('/(owner)/bookings'),
            },
            {
              title: 'Đội ngũ nhân sự & Phân ca',
              subtitle: 'Nhân viên, kỹ năng và ca làm',
              icon: Users,
              onPress: () => router.push('/(owner)/staff'),
            },
            {
              title: 'Danh mục dịch vụ & Gói',
              subtitle: 'Dịch vụ đang bán và gói liệu trình',
              icon: Layers,
              onPress: () => router.push('/(owner)/services'),
            },
          ],
        },
      ]}
    />
  );
}
