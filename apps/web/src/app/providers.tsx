import { useState, type PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createQueryClient } from './queryClient';

export function AppProviders({ children }: PropsWithChildren) {
  const [client] = useState(createQueryClient);
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="spa-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
