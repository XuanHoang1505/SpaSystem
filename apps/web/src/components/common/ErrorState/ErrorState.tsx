import { AppButton } from '../AppButton/AppButton';
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="error-state">
      <p>{message}</p>
      {onRetry && <AppButton onClick={onRetry}>Thử lại</AppButton>}
    </div>
  );
}
