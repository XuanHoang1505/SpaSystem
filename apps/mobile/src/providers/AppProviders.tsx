import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from './QueryProvider';
import { SessionBootstrap } from './SessionBootstrap';
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <SessionBootstrap />
        {children}
      </QueryProvider>
    </SafeAreaProvider>
  );
}
