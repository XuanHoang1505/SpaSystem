import { toast } from 'sonner';
import { ApiClientError, errorCodeOf, usersErrorCodes } from '@spa/api-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useChangeUserStatus } from '../../hooks/useOwnerUsers';

export interface StatusTarget {
  id: string;
  fullName: string;
  action: 'lock' | 'unlock';
}

const copy = {
  lock: {
    title: (name: string) => `Khóa tài khoản ${name}?`,
    description:
      'Người này sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho tới khi mở khóa.',
    confirm: 'Khóa tài khoản',
    done: 'Đã khóa tài khoản.',
  },
  unlock: {
    title: (name: string) => `Mở khóa tài khoản ${name}?`,
    description: 'Người này đăng nhập lại được ngay.',
    confirm: 'Mở khóa',
    done: 'Đã mở khóa tài khoản.',
  },
} as const;

const serverMessage = (error: unknown) =>
  error instanceof ApiClientError && error.status !== 0 ? error.errors[0]?.message : undefined;

/** UC-SPA-05 A2: confirm a lock (ends every session) or an unlock. */
export function ChangeUserStatusDialog({
  target,
  onClose,
  onNotFound,
}: {
  target: StatusTarget | null;
  onClose: () => void;
  onNotFound: () => void;
}) {
  const mutation = useChangeUserStatus();
  const text = copy[target?.action ?? 'lock'];

  const confirm = () => {
    if (!target) return;
    mutation.mutate(
      { id: target.id, status: target.action === 'lock' ? 'locked' : 'active' },
      {
        onSuccess: () => toast.success(text.done),
        onError: (error) => {
          const code = errorCodeOf(error);
          if (code === usersErrorCodes.cannotLockSelf)
            toast.error('Bạn không thể tự khóa tài khoản của mình.');
          else if (code === usersErrorCodes.userNotFound) {
            toast.error('Không tìm thấy tài khoản.');
            onNotFound();
          } else
            toast.error(serverMessage(error) ?? 'Không đổi được trạng thái, vui lòng thử lại.');
        },
        onSettled: onClose,
      },
    );
  };

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{target ? text.title(target.fullName) : ''}</AlertDialogTitle>
          <AlertDialogDescription>{text.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Quay lại</AlertDialogCancel>
          <AlertDialogAction
            variant={target?.action === 'lock' ? 'destructive' : 'default'}
            disabled={mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              confirm();
            }}
          >
            {text.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
