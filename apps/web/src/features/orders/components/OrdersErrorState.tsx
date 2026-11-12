import { ApiClientError } from '@spa/api-client';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { ApiConfigurationError } from '@/lib/errors/ApiConfigurationError';

/** Load error of a cart/order view: configuration (no retry), network or server (docs/specs/orders.md). */
export function OrdersErrorState({
  error,
  title,
  onRetry,
  retrying,
}: {
  error: unknown;
  title?: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  if (error instanceof ApiConfigurationError)
    return <ErrorState title="Lỗi cấu hình" message={error.message} />;
  const network = error instanceof ApiClientError && error.status === 0;
  return (
    <ErrorState
      title={title}
      message={
        network
          ? 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.'
          : 'Đã có lỗi xảy ra, vui lòng thử lại.'
      }
      onRetry={onRetry}
      retrying={retrying}
    />
  );
}
