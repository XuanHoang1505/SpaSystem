import type { ButtonHTMLAttributes } from 'react';
import styles from './AppButton.module.css';
export function AppButton({
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${styles.button} ${className}`}
    >
      {loading ? 'Đang xử lý…' : children}
    </button>
  );
}
