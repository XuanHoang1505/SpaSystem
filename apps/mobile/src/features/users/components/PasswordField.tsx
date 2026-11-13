import type { ComponentProps } from 'react';
import { PasswordInput } from '@features/auth/components/PasswordInput';

/** Password field for the account tab. The show/hide control lives in `PasswordInput`. */
export function PasswordField(
  props: Omit<ComponentProps<typeof PasswordInput>, 'secureTextEntry' | 'trailing'>,
) {
  return <PasswordInput {...props} />;
}
