import { Sparkles, User, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatItem } from '../hooks/useAiChat';
import { AiProductSuggestionCard } from './AiProductSuggestionCard';
import { AiBookingProposalCard } from './AiBookingProposalCard';

interface ChatMessageBubbleProps {
  message: ChatItem;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[88%] sm:max-w-[80%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      <div
        className={cn(
          'size-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold shadow-xs',
          isUser
            ? 'bg-primary text-primary-foreground'
            : message.isError
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary',
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : message.isError ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      <div className="space-y-2.5 overflow-hidden">
        <div
          className={cn(
            'p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-xs',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-xs'
              : message.isError
              ? 'bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-xs'
              : 'bg-muted/80 dark:bg-muted/50 border border-border text-foreground rounded-tl-xs',
          )}
        >
          {message.content}
        </div>

        {message.suggestions && message.suggestions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium text-muted-foreground">Sản phẩm gợi ý:</p>
            <div className="grid grid-cols-1 gap-2">
              {message.suggestions.map((suggestion) => (
                <AiProductSuggestionCard key={suggestion.productId} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}

        {message.bookingProposals && message.bookingProposals.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium text-muted-foreground">Đề xuất khung giờ đặt lịch:</p>
            <div className="space-y-2">
              {message.bookingProposals.map((proposal, idx) => (
                <AiBookingProposalCard
                  key={`${proposal.date}-${proposal.startTime}-${idx}`}
                  proposal={proposal}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
