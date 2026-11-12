import { useEffect, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import type { UserRole, UserStatus } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roleLabels } from '@/features/auth/navigation';
import { userStatusBadge, userStatuses } from '../../userStatus';

const SEARCH_DELAY_MS = 300;
const SEARCH_MAX = 100;
const roles: readonly UserRole[] = ['customer', 'staff', 'owner'];

/** Search (debounced), role and status of SCR-W40; every change goes back to page 1. */
export function UserFilterToolbar({
  search,
  onSearchChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  hasFilters,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  role: UserRole | '';
  onRoleChange: (value: UserRole | '') => void;
  status: UserStatus | '';
  onStatusChange: (value: UserStatus | '') => void;
  hasFilters: boolean;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(search);

  useEffect(() => setDraft(search), [search]);

  useEffect(() => {
    if (draft.trim() === search) return;
    const timer = setTimeout(() => onSearchChange(draft), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, search, onSearchChange]);

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-80">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Tìm theo họ tên, email hoặc số điện thoại"
          placeholder="Tìm theo họ tên, email hoặc số điện thoại"
          value={draft}
          maxLength={SEARCH_MAX}
          onChange={(event) => setDraft(event.target.value)}
          className="h-9 pl-9 text-sm"
        />
      </div>

      <Select
        value={role || 'all'}
        onValueChange={(value) => onRoleChange(roles.find((item) => item === value) ?? '')}
      >
        <SelectTrigger aria-label="Lọc theo vai trò" className="h-9 text-sm sm:w-44">
          <SelectValue placeholder="Tất cả vai trò" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả vai trò</SelectItem>
          {roles.map((item) => (
            <SelectItem key={item} value={item}>
              {roleLabels[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status || 'all'}
        onValueChange={(value) => onStatusChange(userStatuses.find((item) => item === value) ?? '')}
      >
        <SelectTrigger aria-label="Lọc theo trạng thái" className="h-9 text-sm sm:w-48">
          <SelectValue placeholder="Tất cả trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {userStatuses.map((item) => (
            <SelectItem key={item} value={item}>
              {userStatusBadge(item).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft('');
            onReset();
          }}
          className="h-9 gap-1.5 self-start px-2.5 text-xs text-muted-foreground hover:text-foreground sm:self-auto"
        >
          <XIcon className="size-3.5" aria-hidden="true" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
