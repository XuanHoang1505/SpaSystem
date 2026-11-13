import { AppButton } from '@components/common/AppButton';
import { useLogOut } from '../hooks/useLogOut';

/** UC-SPA-02 A3 as a full-width button (staff and owner overviews); the Profile tab uses a menu row instead. */
export function LogOutButton() {
  const { pending, logOut } = useLogOut();
  return (
    <AppButton
      title="Đăng xuất"
      variant="outline"
      loading={pending}
      onPress={() => void logOut()}
    />
  );
}
