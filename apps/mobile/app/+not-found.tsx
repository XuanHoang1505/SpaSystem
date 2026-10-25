import { Link } from 'expo-router';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
export default function NotFound() {
  return (
    <AppScreen>
      <AppText>Không tìm thấy màn hình</AppText>
      <Link href="/" accessibilityLabel="Về trang chủ">
        Về trang chủ
      </Link>
    </AppScreen>
  );
}
