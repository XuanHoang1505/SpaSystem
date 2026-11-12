import { useState } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { AiChatView } from './AiChatView';

export function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();

  // If logged in as staff or owner, AI assistant is disabled (Q-60)
  if (user && (user.role === 'staff' || user.role === 'owner')) {
    return null;
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 max-h-[calc(100vh-6rem)] w-[calc(100vw-2rem)] animate-in overflow-hidden rounded-2xl border bg-background shadow-2xl duration-200 fade-in slide-in-from-bottom-4 sm:w-[420px]">
          <div className="flex items-center justify-between border-b bg-primary px-3 py-2 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">Trợ lý ảo Như Nguyệt Spa</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng khung chat trợ lý AI"
              className="h-7 w-7 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <AiChatView compact />
        </div>
      )}

      <Button
        type="button"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Đóng trợ lý ảo AI' : 'Mở trợ lý ảo AI'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 active:scale-95"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
          </span>
        )}
      </Button>
    </div>
  );
}
