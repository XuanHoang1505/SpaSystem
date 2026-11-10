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
        'flex max-w-[88%] gap-3 sm:max-w-[80%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-xs',
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
            'rounded-2xl p-3.5 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs',
            isUser
              ? 'rounded-tr-xs bg-primary text-primary-foreground'
              : message.isError
                ? 'rounded-tl-xs border border-destructive/20 bg-destructive/10 text-destructive'
                : 'rounded-tl-xs border border-border bg-muted/80 text-foreground dark:bg-muted/50',
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
