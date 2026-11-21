import { AvatarImage } from '@/components/ui/avatar';
import { useMe } from '../hooks/useMe';

/** Shares the profile cache so uploads and deletions update every account avatar. */
export function CurrentUserAvatarImage({ userId }: { userId: string }) {
  const { data: profile } = useMe();
  const avatarUrl = profile?.id === userId ? profile.avatarUrl : null;

  return avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="object-cover" /> : null;
}
