import { useState, type PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useThemeScopeStore } from '@/stores/themeScopeStore';
import { createQueryClient } from './queryClient';
import { SessionBootstrap } from './SessionBootstrap';

export function AppProviders({ children }: PropsWithChildren) {
  const [client] = useState(createQueryClient);
  const scope = useThemeScopeStore((state) => state.scope);
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="spa-theme"
      disableTransitionOnChange
      forcedTheme={scope === 'light-only' ? 'light' : undefined}
    >
      <QueryClientProvider client={client}>
        <SessionBootstrap client={client} />
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
