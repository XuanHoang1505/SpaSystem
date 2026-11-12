import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const initials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

/** Account photo, or the last two initials of the name. */
export function UserAvatar({
  fullName,
  avatarUrl,
  className,
}: {
  fullName: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn('size-9', className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
        {initials(fullName)}
      </AvatarFallback>
    </Avatar>
  );
}
