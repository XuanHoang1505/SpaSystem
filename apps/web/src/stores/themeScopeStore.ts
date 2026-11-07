import { useLayoutEffect } from 'react';
import { create } from 'zustand';

/**
 * `light-only`: public pages and the customer workspace, always light with no toggle. `user`: staff and owner
 * workspaces, where the saved theme applies (docs/specs/auth.md, "Theme").
 */
export type ThemeScope = 'light-only' | 'user';

export const useThemeScopeStore = create<{
  scope: ThemeScope;
  setScope: (scope: ThemeScope) => void;
}>()((set) => ({ scope: 'light-only', setScope: (scope) => set({ scope }) }));

/** Called by a layout to declare its scope before the first paint. */
export function useThemeScope(scope: ThemeScope) {
  const setScope = useThemeScopeStore((state) => state.setScope);
  useLayoutEffect(() => setScope(scope), [scope, setScope]);
}
