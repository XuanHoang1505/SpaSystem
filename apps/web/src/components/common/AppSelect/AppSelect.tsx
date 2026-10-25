import { useId, type SelectHTMLAttributes } from 'react';
export function AppSelect({
  label,
  children,
  id,
  error,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <div className="field">
      <label htmlFor={selectId}>{label}</label>
      <select
        {...props}
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
      >
        {children}
      </select>
      {error && (
        <span id={`${selectId}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
